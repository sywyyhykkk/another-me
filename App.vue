<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { initWechatCloud } from './utils/wechatCloud'

onLaunch(() => {
	initWechatCloud()
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
