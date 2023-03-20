const PRODUCTION = import.meta.env.VITE_ENV === 'production'

const baseURl = PRODUCTION ? '/' : 'http://localhost:8080/'

const timeFormatter = new Intl.DateTimeFormat(
    window.navigator.language || 'en-US',
    { dateStyle: 'medium', timeStyle: 'short' }
)

export function formatTime(time: number): string {
    return timeFormatter.format(time)
}

export async function getSwarms() {
    return await fetch(baseURl + 'swarm/')
}

export async function getSwarmInfo(swarm: string) {
    return await fetch(baseURl + 'swarm/' + swarm)
}

export function sortByProp(items, property: string, direction: 'asc' | 'desc' = 'asc') {
    const sortFn = direction === 'asc' ?
        (a, b) => a[property] - b[property] :
        (a, b) => b[property] - a[property]
    return items.sort(sortFn)
}

export function groupBy(xs, key) {
    return xs.reduce(function (rv, x) {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
}