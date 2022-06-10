export interface Context {
  render(template: string, params?: object, options?: object): Promise<Response>
}
