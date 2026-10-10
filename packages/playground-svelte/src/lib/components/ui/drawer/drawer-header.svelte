<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements'
  import type { WithElementRef } from '#lib/utils.js'
  import { cn } from '#lib/utils.js'

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props()
</script>

<div
  bind:this={ref}
  data-slot="drawer-header"
  class={cn('p-4 flex flex-col gap-1.5', className)}
  {...restProps}
>
  {@render children?.()}
</div>
