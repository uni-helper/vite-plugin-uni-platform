<script setup lang="ts">
import { ref } from 'vue'
import { sum } from '@/utils/test'

const num = ref(1)
</script>

<template>
  <div>{{ sum(num, 2) }} - index.mp-weixin.vue</div>
</template>
