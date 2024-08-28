<script setup>
	import {
		onMounted, 
		ref
	} from 'vue'
	import {
		RouterLink,
		RouterView
	} from 'vue-router'
	import HelloWorld from './components/HelloWorld.vue'

	import router from "@/router"
	// THIS ALSO WORKS
	// import router from "./router/index.js"

	onMounted(() => {
		router.push('/')
	})

	const micmote_logo = ref(new URL('@/assets/logo.png', import.meta.url).href)
</script>

<template>
	<el-header>
		<el-row justify="space-between" style="padding: 1.25em 0">
			<el-col :span="12">
				<el-image :src="micmote_logo" style="height: 1.125em" />
			</el-col>
			<el-col :span="12">
				<RouterLink to="/" class="custom-link">首页</RouterLink>
				<RouterLink to="/about" class="custom-link">关于</RouterLink>
			</el-col>
		</el-row>
	</el-header>
	<el-main>
		<RouterView />
	</el-main>
	<el-footer>Copyright micmote 2024</el-footer>

</template>

<style scoped>
	.el-main {
	  padding: 0
	}
	
	.custom-link.router-link-active {
	  color: blue;
	}
	
	.custom-link {
	  padding: 0px 0.3125em;
	  /* 上下0px，左右20px */
	  text-decoration: none;
	  color: black;
	}
	
	/* The following might not be necessory, cause user agent style sheet for <a> has cursor: pointer  */
	.custom-link:hover {
	  cursor: pointer
	}
	
	.el-header {
	  background-color: #EBEEF5F0;
	  height: 3.5em;
	  width: 100%;
	  /*
		position: fixed;
	  top: 0;
	  left: 0;
	  z-index: 100;
		*/
	}
	
	.el-footer {
	  height: 100%;
	  width: 100%;
	  background-color: lightgray;
	  color: white;
	  padding: 1em 0;
		display: flex;
		justify-content: center;
	}
	
	.demonstration {
	  color: var(--el-text-color-secondary);
	}
	
	h1 {
	  font-size: 1em;
	}
	
	p {
	  font-size: 0.9em;
	  color: #BBBBBB
	}
	
	.el-divider {
	  margin: 0.623em 0
	}
</style>