export interface Error {
//      <- @hejny Probably use a real javascript error here and extend it + it is better to name it something other than just error, for example InternError.
  code: string;
  message: string;
  selected: boolean;
}

/*
export class InternError extends Error {
    public readonly name = 'InternError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, InternError.prototype);
    }
}
*/