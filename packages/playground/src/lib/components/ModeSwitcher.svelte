<script lang='ts'>
  import { Button } from '$lib/components/ui/button'
  import { toggleMode } from 'mode-watcher'
</script>

<Button
  onclick={toggleMode}
  variant='outline'
  size='icon'
  class='transition-none dark:text-foreground dark:border-border/70 dark:bg-muted dark:hover:bg-muted/90'
>
  <div
    class='i-ph:sun-duotone opacity-100 h-[1.2rem] w-[1.2rem] scale-100 transition-all duration-200 dark:opacity-0 dark:scale-0'
  ></div>
  <div
    class='i-ph:moon-duotone opacity-0 h-[1.2rem] w-[1.2rem] scale-0 transition-all duration-200 absolute dark:opacity-100 dark:scale-100'
  ></div>
  <span class='sr-only'>Toggle theme</span>
</Button>
