/**
 * Helper validation function; provide an object and
 * a list of string keys, returns true if all are
 * present & not null.
 * 
 * @param val 
 * @param keyNames 
 */
export function keysNonNull(val:any, keyNames:string[]){
    return keysValid(val, keyNames, (keyVal:any) => keyVal !== null);
  }
  
  /**
   * Helper validation function which checks whether
   * all `propertyNames` are present on `body` and
   * then checks that their values are strings.
   * 
   * @param val 
   * @param keyNames 
   */
  export function keysAreStrings(val:any, keyNames:string[]){
    return keysValid(val, keyNames, isString);
  }
  
  /**
   * Helper validation function which checks whether
   * all `propertyNames` are present on `body` and
   * then checks that their values are booleans.
   * 
   * @param val 
   * @param keyNames 
   */
  export function keysAreBooleans(val:any, keyNames:string[]){
    return keysValid(val, keyNames, isBoolean);
  }
  
  /**
   * Very flexible validation function which accepts
   * an object to check, properties to inspect, and a
   * test function to see if the value is correct.
   * Only returns `true` if `isVal(body.prop)` returns
   * `true` for every `prop in propertyNames`.
   * @param val
   * @param keyNames 
   * @param isValid 
   */
  export function keysValid(val:any, keyNames:string[], isValid:(keyVal:any)=>boolean) {
    if (!isObject(val)) return false;
    return keyNames.every(key => {
      return val.hasOwnProperty(key) && isValid(val[key])
    })
  }
  
  /**
   * Type guard; returns `true` if `maybe` is a string,
   * `false` otherwise.
   * @param val 
   */
  export function isString(val:any): val is string {
    return typeof val === 'string';
  }
  
  /**
   * Type guard; returns `true` if `maybe` is a boolean,
   * `false` otherwise.
   * @param val 
   */
  export function isBoolean(val:any): val is boolean {
    return typeof val === 'boolean';
  }
  
  /**
   * Unofficial type guard, returns true if 
   * `typeof maybe === 'object'`, false otherwise.
   * Does not declare itself as enforcing type
   * `'object'` because then TS thinks the output
   * can't have any other properties.
   * @param val 
   */
  export function isObject(val:any) {
    return typeof val === 'object' && val !== null;
  }
  
  /**
   * Convenient type which takes an interface and
   * produces a type like <Partial>, except that
   * at least one of the properties must be
   * specified.  The second generic argument is
   * what does the Typescript magic, user only
   * specifies the interface, e.g.:
   * 
   * type DappUpdate = AtLeastOne<Dapp.Item.Core>
   * 
   * Taken from @jcalz on StackOverflow:
   * https://stackoverflow.com/a/48244432/2128308
   */
  export type AtLeastOne<T, U = {[K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U];