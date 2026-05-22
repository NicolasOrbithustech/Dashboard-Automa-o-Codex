import { publishPendingTasks } from "../lib/buffer-publisher.mjs";

const result = await publishPendingTasks();

if (result.warning) {
  console.warn(result.warning);
}

console.log(`Encontradas ${result.tasks} tarefas de distribuicao.`);
console.log(JSON.stringify(result.results, null, 2));
