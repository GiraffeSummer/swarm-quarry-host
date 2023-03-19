<script>
    import { Scatter } from 'svelte-chartjs';

    import {
      Chart as ChartJS,
      Title,
      Tooltip,
      Legend,
      LineElement,
      CategoryScale,
      LinearScale,
      PointElement,
    } from 'chart.js';

    ChartJS.register(
      Title,
      Tooltip,
      Legend,
      LineElement,
      CategoryScale,
      LinearScale,
      PointElement
    );

  export let swarmInfo;

  let chartObj;

</script>


<Scatter
  data={{
    labels: ['Scatter'],
    datasets: [
      {
        backgroundColor: 'white',
        label: 'Home',
        data: [{ x: 0, y: 0 }],
      },
      {
        backgroundColor: 'white',
        label: 'Deployed',
        data: [{ x: 0, y: 3 }],
      },
      {
        backgroundColor: 'orange',
        label: 'claimed',
        data: swarmInfo.claimed.map((shaft) => {
          return { y: shaft.x, x: shaft.z };
        }),
      },
      {
        backgroundColor: 'green',
        label: 'complete',
        data: swarmInfo.done.map((shaft) => {
          return { y: shaft.x, x: shaft.z };
        }),
      },
      {
        backgroundColor: 'red',
        label: 'unclaimed',
        data: swarmInfo.shafts.map((shaft) => {
          return { y: shaft.x, x: shaft.z };
        }),
      },
    ],
  }}
/>
