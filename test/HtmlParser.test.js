import HtmlParser from '../src/HtmlParser'

test('html empty', () => {
  const p = new HtmlParser()
  const tree = p.exec()
  expect(tree.length).toBe(0)
  expect(p.toString()).toEqual('')
})
test('<!DOCTYPE html>', () => {
  const p = new HtmlParser(`<!DOCTYPE html>`)
  const tree = p.exec()
  expect(tree.length).toBe(1)
  const node = tree[0]
  expect(node.getName()).toEqual(p.html)
  expect(node.isDocNode()).toBeTruthy()
  expect(p.toString()).toEqual(p.html)
})

test('<!-- comment -->', () => {
  const p = new HtmlParser(`<!-- comment -->`)
  const tree = p.exec()
  expect(tree[0].getName()).toEqual(p.html)
  expect(tree[0].isCommentNode()).toBeTruthy()
  expect(p.toString()).toEqual(p.html)
})

test('text', () => {
  const p = new HtmlParser(`text`)
  const tree = p.exec()
  expect(tree.length).toBe(1)
  const node = tree[0]
  expect(node.getName()).toEqual(p.html)
  expect(node.isTextNode()).toBeTruthy()
  expect(p.toString()).toEqual(p.html)
})

test('attributes: <div class="bg-white">', () => {
  const p = new HtmlParser(`<div class="bg-white">`)
  const node = p.exec()[0]
  expect(node.getAttrs()).toEqual({ class: 'bg-white' })
})

test('attributes: <div class="bg-white" test>', () => {
  const p = new HtmlParser(`<div class='bg-white' test>`)
  const node = p.exec()[0]
  expect(node.getAttrs()).toEqual({ class: 'bg-white', test: true })
})

test('attributes: <video autoplay class= "video" a=b>', () => {
  const p = new HtmlParser(`<video autoplay class= "video" a=b>`)
  const node = p.exec()[0]
  expect(node.getAttrs()).toEqual({ autoplay: true, class: 'video', a: 'b' })
  expect(p.toString()).toEqual(`<video autoplay class="video" a="b"></video>`)
})

test('attributes: <video autoplay >', () => {
  const p = new HtmlParser(`<video autoplay >`)
  const node = p.exec()[0]
  expect(node.getAttrs()).toEqual({ autoplay: true })
})

test('attributes: <video autoplay />', () => {
  const p = new HtmlParser(`<video autoplay />`)
  const node = p.exec()[0]
  expect(node.getAttrs()).toEqual({ autoplay: true })
})

test('not complete <span> & </p>: <div><span>hello</p><div>', () => {
  const text = '<div><span>hello</p><div>'
  const p = new HtmlParser(text)
  p.exec()
  expect(p.toString()).toEqual(
    '<div><span>hello<p></p><div></div></span></div>'
  )
})

test('<script>', () => {
  const text = `<script>var a = document.appendchild('<script>var a = 1;</script>'); function b(){};</script>`
  const p = new HtmlParser(text)
  p.exec()
  expect(p.toString()).toEqual(text)
})

test('<br />', () => {
  const text = '<br />'
  const p = new HtmlParser(text)
  p.exec()
  expect(p.toString()).toEqual('<br/>')
})

test('$on & $emit & querySelect()', () => {
  const text = '<div class="parent"><div class="item"></div></div>'
  const p = new HtmlParser(text)
  p.$on('onClosedTag', ({ node }) => {
    if (node.getAttrs().class === 'parent') {
      node.querySelect((n) => n.getAttrs().class === 'item')
    }
    if (node.getAttrs().class === 'parent') {
      node.querySelect((n) => n.getAttrs().class === 'wrong')
    }
  })
  p.exec()
})

test('Uppercase <Router>', () => {
  const p = new HtmlParser('<Router />')
  p.exec()
  expect(p.toString()).toEqual('<Router></Router>')
})

test('<  input  >', () => {
  const p = new HtmlParser('<  input  >')
  p.exec()
  expect(p.toString()).toEqual('<input/>')
})

test('<  >', () => {
  const p = new HtmlParser('<  >')
  p.exec()
  expect(p.toString()).toEqual('')
})

test('<input></input>', () => {
  const p = new HtmlParser('<input></input><input>')
  p.exec()
  expect(p.toString()).toEqual('<input/><input/>')
})
