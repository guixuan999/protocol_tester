<script setup>
import { ref, onMounted, computed } from 'vue'

const serial_ports = ref([])
const serial_name = ref('')
const bound_rates = [
  460800,
  115200,
  38400
]
const bound_rate = ref(bound_rates[1])

const serial_state = ref("disconnected") // "connected" or "disconnect" or [error message from main process while connecting] 
const serial_ui_disable = ref(false)
const tableData = ref([])
const pause = ref(false) // pause tableData refreshing if true

async function list_serial(event) {
  var r = await window.electron.listSerial()
  console.log(r)
  serial_ports.value = []
  for (var item of r) {
    serial_ports.value.push({
      label: item.path + ' ' + item.friendlyName,
      value: item.path
    })
  }
  if (r.length > 0) {
    // select the first one
    serial_name.value = serial_ports.value[0].value
  }
}

async function connect_serial(event) {
  if (event.target.innerText == "Connect") {
    serial_ui_disable.value = true
    if (!serial_name.value) {
      ElMessage.error('先选择串口')
      serial_ui_disable.value = false
      return
    }
    window.electron.connectSerial({
      path: serial_name.value,
      baudRate: bound_rate.value,
      autoOpen: false,
      inter_frame_pause: 8
    })
  } else {
    /* Disconnect */
    serial_ui_disable.value = true
    var r = await window.electron.disconnetSerial()
    console.log(r)
    ElMessage.success(r)
    serial_state.value = "disconnected"
    serial_ui_disable.value = false
  }
}

const total = ref(0) // total packages in database
const current_page = ref(1)
const PAGE_SIZE = 15 // this will not change

onMounted(async () => {
  var r = await window.electron.getPackages({ page: 1, pagesize: PAGE_SIZE })
  //console.log(r)
  tableData.value = r.rows // r likes {total: N, rows: [...]}
  total.value = r.total
})

window.electron.ipcRenderer_on('result:serial-connect', (event, message) => {
  console.log('Message from main process:', message);
  if (message.result) {
    serial_state.value = "connected"
    ElMessage.success(message.info)
  } else {
    serial_state.value = message.info
    ElMessage.error(message.info)
  }
  serial_ui_disable.value = false

});

let pending_refreshing = false // this is for "don't access database too frequently"
window.electron.ipcRenderer_on('serial:received', async (event /*, message*/) => {
  console.log('a package received on serial');
  if (pause.value) {
    pending_refreshing = true
    return;
  }

  if (!pending_refreshing) {
    pending_refreshing = true
    setTimeout(async () => {
      var r = await window.electron.getPackages({ page: 1, pagesize: PAGE_SIZE })
      console.log(r)
      tableData.value = r.rows // r likes {total: N, rows: [...]}
      total.value = r.total
      current_page.value = 1
      pending_refreshing = false
    }, 1000);
  }

});

async function pageChage(page) {
  console.log("current page:", page)
  var r = await window.electron.getPackages({ page: page, pagesize: PAGE_SIZE })
  console.log(r)
  tableData.value = r.rows // r likes {total: N, rows: [...]}
  total.value = r.total
}

async function pause_continue() {
  pause.value = !pause.value
  if (!pause.value) {
    if (pending_refreshing) {
      var r = await window.electron.getPackages({ page: 1, pagesize: PAGE_SIZE })
      tableData.value = r.rows // r likes {total: N, rows: [...]}
      total.value = r.total
      current_page.value = 1
      pending_refreshing = false
    }
  }
}

const n_terminals = ref(1)
const terminal_template = ref(JSON.stringify({
  device_id: 1,
  on: [
    {
      msg_type: "query",
      ack: true,
      delay_min: 50,
      delay_max: 500,
      delay_rand: false,
      bad_crc: false
    }
  ]
}))

// 在popover中显示
const beautiful_terminal_template = computed(() => {
  const r = JSON.stringify(JSON.parse(terminal_template.value), null, 2)
    .replace(/\n/g, '<br>') // 将换行符替换为 <br> 标签
    .replace(/ /g, '&nbsp;'); // 将空格替换为 &nbsp;
  console.log(r)
  return r
})

// 在弹出对话框里编辑
var terminal_template_for_edit = ref("")

const dialogFormVisible = ref(false)

function editTemplate() {
  dialogFormVisible.value = true
  terminal_template_for_edit.value = JSON.stringify(JSON.parse(terminal_template.value), null, 2)
}

function editTemplate_confirm() {
  console.log("terminal_template_for_edit:", terminal_template_for_edit.value)
  try {
    JSON.parse(terminal_template_for_edit.value)
  } catch (err) {
    ElMessage.error(err.toString())
    return
  }

  terminal_template.value = JSON.stringify(JSON.parse(terminal_template_for_edit.value))
  dialogFormVisible.value = false

}

function add_terminals() {
  var template = JSON.parse(terminal_template.value)
  var { device_id } = tableTerminals.value.reduce((acc, cur) => {
    return cur.device_id > acc.device_id ? cur : acc
  }, template)
  console.log("largest_id:", device_id)
  
  if(device_id > template.device_id) {
    device_id++
  }

  for(var i = 0; i <  n_terminals.value; i++) {
    template.device_id = device_id + i

    tableTerminals.value.push({
      device_id: device_id + i,
      settings: JSON.stringify(template)
    })
  } 
}

function deleteTerminal(index) {
  tableTerminals.value.splice(index, 1)
}

const tableTerminals = ref([])

</script>

<template>
  <div class="simulated_air">
    <el-row style="justify-content: center; padding-top: 10px; font-size: 1.2em; color: blue">
      <span>模拟空口</span>
    </el-row>
    <el-row style="margin-top: 10px; margin-bottom: 10px;">
      <el-col :span="12">
        串口
        <el-select v-model="serial_name" :disabled="serial_state == 'connected'" size="large"
          style="width: 240px; margin-right: 10px">
          <el-option v-for="item in serial_ports" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-button type="info" @click="list_serial" style="margin-right: 30px">List</el-button>

        波特率
        <el-select v-model="bound_rate" :disabled="serial_state == 'connected'" size="large"
          style="width: 120px; margin-right: 10px">
          <el-option v-for="item in bound_rates" :key="item" :label="item" :value="item" />
        </el-select>
        <el-button :type="serial_state == 'connected' ? 'danger' : 'primary'" :disabled="serial_ui_disable"
          @click="connect_serial">{{ serial_state == "connected" ?
        "Disconnect" : "Connect" }}</el-button>
        <span style="margin-left: 10px">{{ serial_state }}</span>
      </el-col>
    </el-row>
  </div>

  <div class="terminals">
    <el-row style="justify-content: center; padding-top: 10px; padding-bottom: 10px;font-size: 1.2em; color:blue">
      <span>模拟终端</span>
    </el-row>
    <el-row>
      <el-col>
        数量
        <el-input-number v-model="n_terminals" :min="1" :max="100" />

        <el-popover effect="dark" placement="top-start" title="" :width="400" trigger="hover">
          <div v-html="beautiful_terminal_template"></div>
          <template #reference>
            <span style="margin-left: 20px">
              模板
              <el-input v-model="terminal_template" style="width: 400px;" :rows="1" type="textarea" readonly
                placeholder="Please input" />
            </span>
          </template>
        </el-popover>

        <el-button style="margin-left: 10px" plain @click="editTemplate">
          编辑
        </el-button>

        <el-button type="primary" style="margin-left: 30px" @click="add_terminals">创建终端</el-button>
      </el-col>

      <el-dialog v-model="dialogFormVisible" title="编辑模板" width="500">
        <el-input v-model="terminal_template_for_edit" :rows="20" type="textarea" />
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="dialogFormVisible = false">Cancel</el-button>
            <el-button type="primary" @click="editTemplate_confirm">
              Confirm
            </el-button>
          </div>
        </template>
      </el-dialog>

    </el-row>
    <el-row>
      <el-table :data="tableTerminals" style="width: 100%; margin-top: 10px" max-height="250">
        <el-table-column prop="device_id" label="Device ID" width="120" />
        <el-table-column prop="settings" label="Settings" />
        <el-table-column fixed="right" label="Operations">
          <template #default="scope">
            <el-button @click="deleteTerminal(scope.$index)" link type="primary" size="small">Delete</el-button>
            <el-button type="primary" size="small" @click="">Edit</el-button>
            <el-button type="danger" size="small">Start</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-row>
  </div>

  <div class="air_data">
    <el-row style="justify-content: center; padding-top: 10px; padding-bottom: 10px;font-size: 1.2em; color:blue">
      <span>空口数据</span>
    </el-row>
    <div class="container">
      <div class="content">
        <el-row>
          <el-table :data="tableData" border style="width: 100%">
            <el-table-column prop="date" label="Date" width="200" />
            <el-table-column prop="direction" label="Direction" width="120" />
            <el-table-column prop="raw" label="Raw" />
          </el-table>
        </el-row>
      </div>
      <div class="overlay" :style="pause ? 'display: block' : 'display: none'"></div>
    </div>
    <el-row style="margin-top: 10px">
      <el-pagination background layout="prev, pager, next, total, jumper" :total="total" :page-size="PAGE_SIZE"
        v-model:current-page="current_page" @current-change="pageChage" />
      <el-button @click="pause_continue" :type="pause ? 'danger' : 'primary'">{{ pause ? "Continue" : "Pause"
        }}</el-button>
    </el-row>
  </div>
</template>

<style scoped>
.simulated_air {
  background-color: azure;
  padding: 10px;
  margin-bottom: 10px;
}

.air_data {
  background-color: rgb(250, 250, 245);
  padding: 10px;
  margin-bottom: 10px;
}

.container {
  position: relative;
}

.content {
  position: relative;
  z-index: 1;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.2);
  /* 黑色遮罩，半透明 */
  pointer-events: none;
  /* 允许用户操作被遮罩的内容 */
  z-index: 2;
}

.terminals {
  background-color: rgb(255, 255, 245);
  padding: 10px;
  margin-bottom: 10px;
}
</style>
