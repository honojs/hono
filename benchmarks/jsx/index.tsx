import Benchmark from 'benchmark'
import { jsx, Fragment } from '../../src/middleware/jsx'

const Content = () => (
  <>
    <p id='a' class='class-name'>
      1<br />a
    </p>
    <p id='b' class='class-name'>
      2<br />b
    </p>
    <div dangerouslySetInnerHTML={{ __html: '<p id="c" class="class-name">3<br/>c</p>' }} />
    {null}
    {undefined}
  </>
)

const Form = () => (
  <form>
    <input type='text' value='a' readonly tabindex={1} />
    <input type='checkbox' value='b' checked={true} tabindex={2} />
    <input type='checkbox' value='c' checked={true} tabindex={3} />
    <input type='checkbox' value='d' checked={false} tabindex={4} />
    <input type='checkbox' value='e' checked={false} tabindex={5} />
  </form>
)

const Page = () => (
  <html>
    <body>
      <Content />
      <Form />
    </body>
  </html>
)

const suite = new Benchmark.Suite()

suite
  .add('render', () => {
    Page().toString()
  })
  .on('cycle', (ev: any) => {
    console.log(String(ev.target))
  })
  .on('complete', (ev: any) => {
    console.log(`Fastest is ${ev.currentTarget.filter('fastest').map('name')}`)
  })
  .run({ async: true })
