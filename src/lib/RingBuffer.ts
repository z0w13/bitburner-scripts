export default class RingBuffer<T> {
  protected _data: Array<T>

  constructor(protected _size: number) {
    this._data = new Array<T>(_size)
  }

  get length(): number {
    return this._size
  }

  push(value: T) {
    while (this._data.length > this._size) {
      this._data.shift()
    }

    this._data.push(value)
  }

  get(): Array<T> {
    return [...this._data]
  }

  getNonEmpty(): Array<T> {
    return this.get().filter((v) => v !== null && v !== undefined)
  }
}
