import { XOR } from 'ts-xor';
import { isString, isObject } from './validators';


/**
 * All possible options which can be fed into our shared
 * response generator functions.
 */
export interface ResponseOptions {

    isErr? : boolean
  
    /**
     * Will yield a `201` error code, following HTTP spec
     */
    isCreate? : boolean
  
    /**
     * If set & item was not found, will yield a proper
     * `404` error code.
     */
    isRead? : boolean
  
    /**
     * Manually set an error code according to the situation.
     */
    errorResponseCode? : number
  }



/**
 * All error responses from our API will include a message key.
 */
export interface ApiError extends Error {
  message : string
}

/**
 * General shape which all responses from our API conform to.
 * An object `res` where either `res.data` or `res.err` won't 
 * be `null`, depending on whether your call succeeded.
 * Both will always be defined.  Note that this just describes
 * the body of the response.  If there's an error, the error
 * code will also be set to 4xx or 5xx, so your request
 * tool will automatically detect there's an error.
 */
export type ApiResponse<ResponseType> = XOR<SuccessResponse<ResponseType>, ErrorResponse>

/**
 * Successful response from our API.  `data` will contain the
 * corresponding `Result`, `err` will be null.
 */
export interface SuccessResponse<ResultType=any> {
  data: ResultType
  err: null
}

/**
 * Type guard; only returns `true` if object shape has a non-null
 * `data` value and `err` has a null value.
 * @param val 
 */
export function isSuccessResponse<ResultType>(val:any): val is SuccessResponse<ResultType> {
  return isObject(val) && val.data && val.err === null
}

/**
 * Error response from our API.  `err` will contain an `ApiError`,
 * while `data` will be `null`.
 */
export interface ErrorResponse {
  data : null
  err : ApiError
}

/**
 * Type guard; only returns `true` if object shape has a null
 * `data` value and a non-null `err` value.
 * @param val 
 */
export function isErrResponse(val:any): val is ErrorResponse {
  return isObject(val) && val.err && val.data === null
}

/**
 * Basic result which simply contains a message about
 * the action that was taken.
 */
export type MessageResult = {
  message : string
}

/**
 * Type guard; only returns `true` if `res` has a
 * `message` key holding a `string` value.
 * @param val
 */
export function isMessageResult(val:any):val is MessageResult {
  return isObject(val) && isString(val.message);
}

/**
 * Factory function which accepts a string to produce
 * a new message result.
 * @param message 
 */
export function newMessageResult(message:string): MessageResult {
  return { message }
}

/**
 * Basic response which simply contains a message about
 * the action that was taken.
 */
export type MessageResponse = ApiResponse<{ message: string }>

/**
 * Namespace containing types for the key HTTP verbs.
 * Each verb has a dedicated string literal type, and
 * then `HttpMethods.ANY` allows any of those values.
 */
export namespace HttpMethods {
  export type PUT = 'PUT';
  export type DELETE = 'DELETE';
  export type GET = 'GET';
  export type OPTIONS = 'OPTIONS';
  export type POST = 'POST';
  export type ANY = POST | PUT | DELETE | GET | OPTIONS;
}

/**
 * HttpMethods type is a union of string literals, rather than
 * an enum, because these literals will not change over time.
 * Enums make it easy to change values in the future, like if
 * we restructure our API.  For values which are an unchanging
 * constants, simply specifying string literals still gives us
 * the guarantee of no typos.  It also means that we can satisfy
 * the type by writing 'POST', rather than HttpMethods.POST.
 */

export function isHttpMethod(val:any): val is HttpMethods.ANY {
  if (!isString(val)) return false;
  let httpMethods:HttpMethods.ANY[] = [
    'POST', 'PUT', 'DELETE', 'GET', 'OPTIONS'
  ]
  return httpMethods.includes(val as HttpMethods.ANY)
}

/**
 * Generalized function which uses the provided `body` to
 * build a response object; prefer to instead use the more
 * specific functions which will correctly set options for
 * you.  
 * 
 * Depending on whether `opts` say it's an error, the final
 * response body will either have `res.data = JSON.stringify(body)`
 * or `res.err = JSON.stringify(body)`.  The other property
 * will always be null.  In the case of `isErr` without a
 * more specific error code, return code is `500`.
 * @param body 
 * @param opts 
 */
export function response(body:any, opts:ResponseOptions) {
  let responseCode = 200;
  // Override response code based on opts
  if (opts.isErr) {
      if (opts.errorResponseCode) {
          responseCode = opts.errorResponseCode;
      } else {
          responseCode = 500;
      }
  } else if (opts.isCreate) {
      responseCode = 201;
  } else if (opts.isRead) {
      if (body.hasOwnProperty("exists") && !body.exists) {
          // Dapp Not Found
          // This looks like a success response but uses error code 404
          responseCode = 404;
      }
  }

  let responseHeaders = {
      'Content-Type': 'application/json', 
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization,Content-Type'
  };
  

  let responseBody:ApiResponse<any> = {
      data: opts.isErr ? null : body,
      err: opts.isErr ? body : null
  };
  return {
      statusCode: responseCode,
      headers: responseHeaders,
      body: JSON.stringify(responseBody)
  }
}

/**
 * Helper response function; correctly builds our response object
 * for a successful `200` response.  `body` will become the value in
 * `res.data`, `res.err` will be `null`.
 * @param body 
 * @param opts 
 */
export function successResponse(
  body:any, opts:ResponseOptions={isCreate: false}
) {
  let successOpt = {isErr: false};
  let callOpts = {...opts, ...successOpt};
  return response(body, callOpts);
}

/**
 * Helper response function; correctly builds our response object
 * in the case of a user error.  This would include things like
 * requests with invalid bodies.  It sets the return code to `400`,
 * which means "Bad Request".  `res.data` will be `null`, and
 * `res.err` will be this `body`.
 * @param body 
 * @param opts 
 */
export function userErrorResponse(body:any, opts:ResponseOptions={isCreate: false}) {
  let errorOpt = {
    isErr: true, 
    errorResponseCode : opts.errorResponseCode || 400
  };
  let callOpts = {...opts, ...errorOpt};
  return response(body, callOpts);
}

/**
 * Helper response function; correctly builds our response object
 * in the case of some internal error.  If a method we don't expect
 * to throw an error suddenly does, then we should return this
 * `unexpectedErrorResponse()`.  This sets the return code to `500`,
 * which means "Internal Server Error".
 * @param body 
 * @param opts 
 */
export function unexpectedErrorResponse(body:any, opts:ResponseOptions={isCreate: false}) {
  let errorOpt = {
    isErr: true, 
    errorResponseCode : opts.errorResponseCode || 500
  };
  let callOpts = {...opts, ...errorOpt};
  return response(body, callOpts);
}

