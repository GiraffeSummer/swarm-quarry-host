<script>
  import {
    getSwarms,
    getSwarmInfo,
    sortByProp,
    groupBy,
    formatTime,
  } from '../lib/functions';
  import SwarmInfo from './SwarmInfo.svelte';
  export let swarm;
</script>

<article>
  <header>
    <h3 style="margin: 0;padding:0;">
      {swarm}
    </h3>
  </header>
  <div>
    <SwarmInfo {swarm} />
  </div>
</article>
