<template>
  {{ sum(num, 2) }}
</template>

<script setup lang="ts">
import { sum } from "@/utils/test";
import { ref } from "vue";
const num = ref(1);
</script>

<style>
body::after {
  content: "index";
}
</style>
