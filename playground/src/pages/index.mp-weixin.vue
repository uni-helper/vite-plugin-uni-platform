<template>
  <div>{{ sum(num, 2) }} - mp-weixin</div>
</template>

<script setup lang="ts">
import { sum } from "@/utils/test";
import { ref } from "vue";
const num = ref(1);
</script>
