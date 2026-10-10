<script lang="ts">
  import type { HTMLInputAttributes, HTMLInputTypeAttribute } from 'svelte/elements'
  import type { WithElementRef } from '#lib/utils.js'
  import { cn } from '#lib/utils.js'

  type InputType = Exclude<HTMLInputTypeAttribute, 'file'>

  type Props = WithElementRef<
    Omit<HTMLInputAttributes, 'type'> &
      ({ type: 'file'; files?: FileList } | { type?: InputType; files?: undefined })
  >

  let {
    ref = $bindable(null),
    value = $bindable(),
    type,
    files = $bindable(),
    class: className,
    'data-slot': dataSlot = 'input',
    ...restProps
  }: Props = $props()
</script>

{#if type === 'file'}
  <input
    bind:this={ref}
    data-slot={dataSlot}
    class={cn(
      'text-sm font-medium px-3 pt-1.5 outline-none border border-input rounded-md bg-transparent flex h-9 min-w-0 w-full ring-offset-background shadow-xs transition-[color,box-shadow] placeholder:text-muted-foreground selection:text-primary-foreground dark:bg-input/30 selection:bg-primary disabled:opacity-50 disabled:cursor-not-allowed',
      'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
      'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
      className,
    )}
    type="file"
    bind:files
    bind:value
    {...restProps}
  />
{:else}
  <input
    bind:this={ref}
    data-slot={dataSlot}
    class={cn(
      'text-base px-3 py-1 outline-none border border-input rounded-md bg-background flex h-9 min-w-0 w-full ring-offset-background shadow-xs transition-[color,box-shadow] md:text-sm placeholder:text-muted-foreground selection:text-primary-foreground dark:bg-input/30 selection:bg-primary disabled:opacity-50 disabled:cursor-not-allowed',
      'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
      'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
      className,
    )}
    {type}
    bind:value
    {...restProps}
  />
{/if}
