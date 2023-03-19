<script>
  import { onMount } from 'svelte';
  import {
    getSwarms,
    getSwarmInfo,
    sortByProp,
    groupBy,
    formatTime,
  } from './lib/functions';

  import Swarm from './components/Swarm.svelte';

  let swarms = [];
  let swarmsInfo = {};

  onMount(loadSwarms);

  async function loadSwarms() {
    const response = await getSwarms();
    const data = await response.json();
    if ('success' in data) {
      swarms = data.success;

      // swarms.forEach(async (swarm) => {
      //   const swarmResponse = await getSwarmInfo(swarm);
      //   const swarmData = await swarmResponse.json();

      //   if ('success' in swarmData) {
      //     console.log(swarmData.success[swarm]);
      //     swarmsInfo[swarm] = swarmData.success[swarm];
      //   }
      // });
    }
  }
</script>

<main class="container">
  {#each swarms as swarm (swarm)}
    <Swarm {swarm} />
  {:else}
    <article>
      <div>No swarms found :/</div>
    </article>
  {/each}
</main>
