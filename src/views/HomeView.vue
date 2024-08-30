<script setup>
import { ref } from 'vue'

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
  if (!pending_refreshing) {
    pending_refreshing = true
    setTimeout(async () => {
      var r = await window.electron.getPackages({ page: 1, pagesize: 15 })
      console.log(r)
      tableData.value = r.rows // r likes {total_pages: N, rows: [...]}
      pending_refreshing = false
    }, 1000);
  }

});

</script>

<template>

  串口
  <el-select v-model="serial_name" :disabled="serial_state == 'connected'" size="large" style="width: 240px">
    <el-option v-for="item in serial_ports" :key="item.value" :label="item.label" :value="item.value" />
  </el-select>
  <el-button type="info" @click="list_serial">List</el-button>

  波特率
  <el-select v-model="bound_rate" :disabled="serial_state == 'connected'" size="large" style="width: 120px">
    <el-option v-for="item in bound_rates" :key="item" :label="item" :value="item" />
  </el-select>
  <el-button :type="serial_state == 'connected' ? 'danger' : 'primary'" :disabled="serial_ui_disable"
    @click="connect_serial">{{ serial_state == "connected" ?
    "Disconnect" : "Connect" }}</el-button>
  <span>{{ serial_state }}</span>

  <el-table :data="tableData" border style="width: 100%">
    <el-table-column prop="date" label="Date" width="180" />
    <el-table-column prop="direction" label="Direction" width="180" />
    <el-table-column prop="raw" label="Raw" />
  </el-table>


</template>
