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

function connect_serial() {
  if(!serial_name.value) {
    ElMessage.error('先选择串口')
    return
  }
  window.electron.connectSerial({
    path: serial_name.value,
    baudRate: bound_rate.value,
    autoOpen: false,
    inter_frame_pause: 8
  })
}
</script>

<template>

  串口
  <el-select v-model="serial_name" size="large" style="width: 240px">
    <el-option v-for="item in serial_ports" :key="item.value" :label="item.label" :value="item.value" />
  </el-select>
  <el-button type="info" @click="list_serial">List</el-button>

  波特率
  <el-select v-model="bound_rate" size="large" style="width: 120px">
    <el-option v-for="item in bound_rates" :key="item" :label="item" :value="item" />
  </el-select>
  <el-button type="primary" @click="connect_serial">Connect</el-button>


</template>
