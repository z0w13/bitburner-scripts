import _ from 'lodash'
import * as bitburner from "./NetscriptDefinitions";
import { GlobalState } from "/lib/shared/GlobalStateManager";

export { };

declare global {
    const _: typeof _

    interface NS extends bitburner.NS {}

    type AutocompleteConfig = [string, string | number | boolean | string[]][];

    interface AutocompleteData {
        servers: string[],
        txts: string[],
        scripts: string[],
        flags: (config: AutocompleteConfig) => any
    }
}


declare global {
  var __globalState: GlobalState | undefined
}
