<script setup lang="ts">
import { ref } from 'vue'
import { sum } from '@/utils/test'

const num = ref(1)
</script>

<template>
  {{ sum(num, 2) }}
</template>

<style>
body::after {
  content: "index";
}
</style>
