<script setup>
import { ref, onMounted } from 'vue'

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

  <div class="air_data">
    <el-row style="justify-content: center; padding-top: 10px; padding-bottom: 10px;font-size: 1.2em; color:blue">
      <span>空口数据</span>
    </el-row>
    <el-row>
      <el-table :data="tableData" border style="width: 100%">
        <el-table-column prop="date" label="Date" width="200" />
        <el-table-column prop="direction" label="Direction" width="120" />
        <el-table-column prop="raw" label="Raw" />
      </el-table>
    </el-row>
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
</style>
