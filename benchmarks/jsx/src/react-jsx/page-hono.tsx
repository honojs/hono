/** @jsxImportSource ../../../../src/jsx **/

export const buildPage = () => {
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
      <input type='text' value='1234567890 < 1234567891' readonly tabindex={1} />
      <input type='checkbox' value='1234567890 < 1234567891' checked={true} tabindex={2} />
      <input type='checkbox' value='1234567890 < 1234567891' checked={true} tabindex={3} />
      <input type='checkbox' value='1234567890 < 1234567891' checked={false} tabindex={4} />
      <input type='checkbox' value='1234567890 < 1234567891' checked={false} tabindex={5} />
    </form>
  )

  return () => (
    <html>
      <body>
        <Content />
        <Form />
      </body>
    </html>
  )
}
