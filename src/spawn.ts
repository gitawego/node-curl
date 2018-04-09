import * as child from 'child_process';
/**
 * Limit the amount of processes that can be spawned per tick.
 */

const max_per_tick = 10;
let spawned = 0;
let resetting = false;

/**
 * See `child_process.spawn()`.
 */

export function spawn(
  cmd: string,
  args: string[],
  options: child.SpawnOptions,
  callback: (spanwed: child.ChildProcess) => void
) {
  const spawnArgs: any[] = Array.prototype.slice.call(arguments);
  if (spawned < max_per_tick) {
    spawned++;
    callback(child.spawn.apply(child, spawnArgs.slice(0, -1)));
  } else {
    if (!resetting) {
      resetting = true;
      process.nextTick(function() {
        spawned = 0;
        resetting = false;
      });
    }
    process.nextTick(function() {
      spawn.apply(null, spawnArgs);
    });
  }
}
