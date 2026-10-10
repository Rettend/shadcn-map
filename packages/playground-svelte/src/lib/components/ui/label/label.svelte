<script lang="ts">
  import { Label as LabelPrimitive } from 'bits-ui'
  import { cn } from '#lib/utils.js'

  let { ref = $bindable(null), class: className, ...restProps }: LabelPrimitive.RootProps = $props()
</script>

<LabelPrimitive.Root
  bind:ref
  data-slot="label"
  class={cn(
    'text-sm leading-none font-medium flex gap-2 select-none items-center group-data-[disabled=true]:opacity-50 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed group-data-[disabled=true]:pointer-events-none',
    className,
  )}
  {...restProps}
/>
