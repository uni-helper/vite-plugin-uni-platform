import type { FilterPattern } from 'vite'

export interface Options {
  /**
   * @default "**\/*"
   */
  include: FilterPattern
  /**
   * @default ['/node_modules/', '/.git/']
   */
  exclude: FilterPattern
}

export interface UserOptions extends Partial<Options> {

}

export interface ResolvedOptions extends Options {

}
