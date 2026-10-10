<script lang="ts">
  import { Drawer as DrawerPrimitive } from 'vaul-svelte'
  import { cn } from '#lib/utils.js'

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: DrawerPrimitive.OverlayProps = $props()
</script>

<DrawerPrimitive.Overlay
  bind:ref
  data-slot="drawer-overlay"
  class={cn(
    'bg-black/50 inset-0 fixed z-50 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
    className,
  )}
  {...restProps}
/>
