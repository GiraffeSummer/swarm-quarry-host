<script>
  import { getSwarmInfo, sortByProp, formatTime } from '../lib/functions';
  import { onMount } from 'svelte';
  import ShaftChart from './ShaftChart.svelte';

  export let swarm;

  let swarmInfo = undefined;
  let totalShafts = 0;

  onMount(async () => {
    const response = await getSwarmInfo(swarm);
    const data = await response.json();

    if ('success' in data) {
      swarmInfo = data.success[swarm];
      totalShafts =
        swarmInfo.shafts.length +
        swarmInfo.claimed.length +
        swarmInfo.done.length;
    }
  });
</script>

{#if swarmInfo}
  <progress value={swarmInfo.done.length} max={totalShafts} />
  <ul>
    <li>Size: {swarmInfo.w}x{swarmInfo.h}</li>
    <li>
      Created at: {formatTime(swarmInfo.time_created)}
    </li>


    {#if swarmInfo.done.length > 0}
      <li>
        recent finished turtle: {sortByProp(swarmInfo.done, 'completed_time')[0]
          .claimed_by}
      </li>
    {/if}

    {#if swarmInfo.claimed.length > 0}
      <li>
        recent claimed turtle: {sortByProp(swarmInfo.claimed, 'claimed_time')[0]
          .claimed_by}
      </li>
    {/if}

    
    <li>
      Unclaimed shafts: {swarmInfo.shafts.length}
    </li>

    
    <li>
      <details>
        <summary>Shafts: {totalShafts}</summary>
        <div>
          <ShaftChart {swarmInfo} />
        </div>
      </details>
    </li>
    <li>
      <details>
        <summary>Claimed: {swarmInfo.claimed.length}</summary>
        <table>
          <tr>
            <th><strong>X - Z</strong></th>
            <th><strong>turtle</strong></th>
            <th><strong>claimed at</strong></th>
          </tr>
          {#each swarmInfo.claimed as claimed}
            <tr>
              <td>
                {claimed.x} - {claimed.z}
              </td>
              <td>
                {claimed.claimed_by}
              </td>
              <td>
                {formatTime(claimed.claimed_time)}
              </td>
            </tr>
          {/each}
        </table>
      </details>
    </li>
    <li>
      <details>
        <summary> Completed: {swarmInfo.done.length}</summary>
        <table>
          <tr>
            <th><strong>X - Z</strong></th>
            <th><strong>turtle</strong></th>
            <th><strong>claimed at</strong></th>
            <th><strong>completed at</strong></th>
          </tr>
          {#each swarmInfo.done as completed}
            <tr>
              <td>
                {completed.x} - {completed.z}
              </td>
              <td>
                {completed.claimed_by}
              </td>
              <td>
                {formatTime(completed.claimed_time)}
              </td>
              <td>
                {formatTime(completed.completed_time)}
              </td>
            </tr>
          {/each}
        </table>
      </details>
    </li>
  </ul>
{:else}
  No info on <i>{swarm}</i>
{/if}
