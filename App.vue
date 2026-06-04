<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { initWechatCloud } from './utils/wechatCloud'

onLaunch(() => {
	console.log('App Launch')
	initWechatCloud()
})

onShow(() => {
	console.log('App Show')
})

onHide(() => {
	console.log('App Hide')
})
</script>

<style lang="scss">
page {
	background-color: $am-bg;
}

button::after {
	border: none;
}
</style>
