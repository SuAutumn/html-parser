import State from './State'
import { SELF_CLOSE_TAGS } from './const'
import HtmlNode, { HtmlNodeType } from './HtmlNode'

type SimpleFunction = (...args: any[]) => any

interface HtmlParserEventParams extends Record<string, any> {
  node: HtmlNode
}

enum EventName {
  OnClosedTag = 'onClosedTag',
  onOpenedTag = 'onOpenedTag',
}
export default class HtmlParser {
  /** 父node stack 用于关联父子关系 */
  private parentNodeStack: HtmlNode[] = []

  /** 原始html字符串 */
  private html = ''

  /** current text */
  private text = ''

  /** 解析之后的树结构 */
  private tree: HtmlNode[] = []

  /** 回调函数集合 */
  private cbs: Record<string, SimpleFunction> = {}

  /** 符号集合 eg: '' "" {} [] */
  private symbols: string[] = []

  /** 当前token状态 */
  private status?: State

  /** 当前指针位置 */
  private offset = 0

  /** 原始html长度 */
  private length = 0

  /** 一个新的标签开始的位置 */
  private _start = 0
  private _tagName?: string

  constructor(html?: string) {
    if (typeof html === 'string') {
      this.setHtml(html)
    }
  }

  $on(eventName: EventName, cb: SimpleFunction) {
    this.cbs[eventName] = cb
  }

  // 支持事件 onClosedTag, onClosedTagName
  $emit(eventName: EventName, params: HtmlParserEventParams) {
    if (typeof this.cbs[eventName] === 'function') {
      this.cbs[eventName](params)
    }
  }

  /**
   * 初始化状态
   * @param html {string} - raw html text
   */
  setHtml(html: string) {
    this.html = html
    this.status = this.initState(this.html)
    // this.offset = 0
    this.length = this.html.length
  }

  initState(html: string) {
    if (html.charAt(0) === '<') {
      return State.OpenTag
    } else {
      return State.Text
    }
  }

  handleOpenTag(c: string) {
    if (c === '<') {
      this._start = this.offset // 记录起始位置
    } else if (c === '!') {
      if (this.nextChar() === 'D') {
        this.status = State.OpenDoctype
      }
      if (this.nextChar() === '-') {
        this.status = State.OpenCommentTag
      }
    } else if (c === '/') {
      // </div>
      this.status = State.BeforeCloseTag
      this.backOffset()
    } else if (HtmlParser.isAlphaChar(c)) {
      // a-z
      this.status = State.OpeningTagName
      this.backOffset()
    } else if (HtmlParser.isWhiteSpace(c)) {
      // <    > ignore
    }
  }

  // 即将打开tag名
  // handleOpenTagName(c: string) {
  //   if (HtmlParser.isAlphaChar(c)) {
  //     this.status = State.OpeningTagName
  //     this.backOffset()
  //   }
  // }

  handleOpeningTagName(c: string) {
    if (HtmlParser.isWhiteSpace(c) || c === '>' || c === '/') {
      // <div ...>
      this.status = State.ClosedTagName
      this.backOffset()
    } else {
      // 记录字符
      this.setTextByChar(c)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleClosedTagName(_c: string) {
    const node = new HtmlNode(this.text, HtmlNodeType.Element, this._start)
    // node.setName(this.text)
    // node.setTypeEle()
    this.resetText()
    this.status = State.BeforeOpenAttributeName
    this.backOffset()
    // 添加层级关系
    this.addNodeToParent(node)
  }

  handleBeforeOpenAttributeName(c: string) {
    // <div class="..." style="...">
    if (HtmlParser.isWhiteSpace(c)) {
      // ignore
    } else if (c === '/') {
      // <div/>
      this.status = State.BeforeCloseTag
      this.backOffset()
    } else if (c === '>') {
      // <div>
      this.status = State.ClosedTag
    } else {
      this.status = State.OpeningAttributeName
      this.backOffset()
    }
  }

  handleOpeningAttributeName(c: string) {
    if (HtmlParser.isWhiteSpace(c) || c === '=' || c === '/' || c === '>') {
      this.status = State.ClosedAttributeName
      this.backOffset()
    } else {
      // 记录字符
      this.setTextByChar(c)
    }
  }

  handleClosedAttributeName(c: string) {
    const node = this.lastElement(this.parentNodeStack)
    node?.setAttrName(this.text)
    this.resetText()
    if (HtmlParser.isWhiteSpace(c)) {
      // <div class style="...">
      this.status = State.BeforeOpenAttributeName
    } else if (c === '=') {
      this.status = State.BeforeOpenAttributeValue
    } else if (c === '/') {
      this.status = State.BeforeCloseTag
      this.backOffset()
    } else if (c === '>') {
      this.status = State.ClosedTag
    }
  }

  handleBeforeOpenAttributeValue(c: string) {
    if (HtmlParser.isWhiteSpace(c) || c === '=') {
      // ignore
    } else if (c === '"' || c === "'") {
      this.status = State.OpeningAttributeValue
      this.symbols.push(c)
    } else {
      this.status = State.OpeningAttributeValue
      this.backOffset()
    }
  }

  handleOpeningAttributeValue(c: string) {
    // class="xxxx"
    if (this.symbols.length > 0) {
      if (this.lastElement(this.symbols) === c) {
        this.status = State.ClosingAttributeValue
        this.backOffset()
        this.symbols.pop()
      } else {
        this.setTextByChar(c)
      }
    } else if (HtmlParser.isWhiteSpace(c) || c === '/' || c === '>') {
      // class=xxxx
      this.status = State.ClosingAttributeValue
      this.backOffset()
    } else {
      this.setTextByChar(c)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleClosingAttributeValue(_c: string) {
    const node = this.lastElement(this.parentNodeStack)
    node?.setAttrValue(this.text)
    this.resetText()
    this.status = State.ClosedAttributeValue
    this.backOffset()
  }

  handleClosedAttributeValue(c: string) {
    if (HtmlParser.isWhiteSpace(c)) {
      this.status = State.BeforeOpenAttributeName
    } else if (c === '/') {
      // <div/>
      this.status = State.BeforeCloseTag
      this.backOffset()
    } else if (c === '>') {
      // <div>
      this.status = State.ClosedTag
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleBeforeCloseTag(_c: string) {
    this.status = State.ClosingTag
    this._tagName = this.lastElement(this.parentNodeStack)?.getName()
  }

  handleClosingTag(c: string) {
    if (c === '>') {
      // <img xxxxx/> self close
      if (this.text === '') {
        this.status = State.ClosedTag
      } else {
        if (SELF_CLOSE_TAGS.indexOf(this.text) === -1) {
          // 非自闭和标签
          if (this.text !== this._tagName) {
            this.fixOrderErrInParentStack(this.text)
          }
          this.status = State.ClosedTag
        } else {
          // 自闭和标签直接舍弃
          if (this.nextChar()) {
            // 防止溢出
            this.status = this.initState(this.nextChar())
          }
        }
      }
      this.resetText()
    } else if (HtmlParser.isWhiteSpace(c)) {
      // ignore
    } else {
      this.setTextByChar(c)
    }
  }

  // >x
  handleClosedTag(c: string) {
    const node = this.lastElement(this.parentNodeStack)
    if (node) {
      // <meta> 检查是否是自闭合标签
      if (
        this._tagName ||
        node.isSelfCloseTag() ||
        node.isDocNode() ||
        node.isCommentNode() ||
        node.isTextNode()
      ) {
        this._tagName = undefined
        // 收尾
        this.popNodeFromParent()
        node.setEnd(this.offset - 1, this.html)
        this.$emit(EventName.OnClosedTag, { node })
      } else {
        this.$emit(EventName.onOpenedTag, { node })
      }
    }
    const pNode = this.lastElement(this.parentNodeStack)
    if (node === pNode && pNode?.isScript()) {
      // node === pNode 说明没有移除stack元素，即script node 准备添加script内容
      this.status = State.OpeningScript
      this.backOffset()
    } else if (c === '<') {
      this.status = State.OpenTag
      this.backOffset()
    } else if (c) {
      // 去除 c 为 undefined
      this.status = State.Text
      this.backOffset()
    }
  }

  handleText(c: string) {
    if (c === '<' || c === '') {
      const node = new HtmlNode(
        this.text,
        HtmlNodeType.Text,
        this.offset - this.text.length
      )
      // node.setTypeText()
      // node.setName(this.text)
      this.resetText()
      this.addNodeToParent(node)
      this.status = State.ClosedTag
      // 回退1
      this.backOffset()
    } else {
      this.setTextByChar(c)
    }
  }

  // <!DOCTYPE html>
  handleOpenDoctype(c: string) {
    if (c === '>') {
      const node = new HtmlNode(
        this.html.slice(this._start, this.offset + 1),
        HtmlNodeType.Doctype,
        this._start
      )
      // node.setTypeDoc()
      // node.setName(this.html.slice(this._start, this.offset + 1))
      this.addNodeToParent(node)
      this.status = State.ClosedTag
    }
  }

  // html comment
  handleOpenCommentTag(c: string) {
    if (this.beforeChar() === '-' && c === '>') {
      const node = new HtmlNode(
        this.html.slice(this._start, this.offset + 1),
        HtmlNodeType.Comment,
        this._start
      )
      // node.setTypeComment()
      // node.setName(this.html.slice(this._start, this.offset + 1))
      this.addNodeToParent(node)
      this.status = State.ClosedTag
    }
  }

  handleOpeningScript(c: string) {
    if (c === "'" || c === '"') {
      this.lastElement(this.symbols) !== c
        ? this.symbols.push(c)
        : this.symbols.pop()
    }
    if (c === '{' || c === '(' || c === '[') {
      this.symbols.push(c)
    }
    if (c === '}' || c === ')' || c === ']') {
      this.symbols.pop()
    }
    if (c === '<' && this.symbols.length === 0) {
      this.status = State.Text
      this.backOffset()
    } else {
      this.setTextByChar(c)
    }
  }

  exec() {
    while (this.offset <= this.length) {
      const c = this.html.charAt(this.offset)
      switch (this.status) {
        case State.Text:
          this.handleText(c)
          break
        case State.OpenDoctype:
          this.handleOpenDoctype(c)
          break
        case State.OpenCommentTag:
          this.handleOpenCommentTag(c)
          break
        case State.OpenTag:
          this.handleOpenTag(c)
          break
        // case State.OpenTagName:
        //   this.handleOpenTagName(c)
        //   break
        case State.OpeningTagName:
          this.handleOpeningTagName(c)
          break
        case State.ClosedTagName:
          this.handleClosedTagName(c)
          break
        case State.BeforeOpenAttributeName:
          this.handleBeforeOpenAttributeName(c)
          break
        case State.OpeningAttributeName:
          this.handleOpeningAttributeName(c)
          break
        case State.ClosedAttributeName:
          this.handleClosedAttributeName(c)
          break
        case State.BeforeOpenAttributeValue:
          this.handleBeforeOpenAttributeValue(c)
          break
        case State.OpeningAttributeValue:
          this.handleOpeningAttributeValue(c)
          break
        case State.ClosingAttributeValue:
          this.handleClosingAttributeValue(c)
          break
        case State.ClosedAttributeValue:
          this.handleClosedAttributeValue(c)
          break
        case State.BeforeCloseTag:
          this.handleBeforeCloseTag(c)
          break
        case State.ClosingTag:
          this.handleClosingTag(c)
          break
        case State.ClosedTag:
          this.handleClosedTag(c)
          break
        case State.OpeningScript:
          this.handleOpeningScript(c)
          break
      }
      this.offset++
    }
    // 处理余留
    if (this.parentNodeStack.length > 0) {
      for (let i = this.parentNodeStack.length; i > 0; i--) {
        const node = this.parentNodeStack[i - 1]
        this.popNodeFromParent()
        node.setEnd(this.length - 1, this.html)
        this.$emit(EventName.OnClosedTag, { node })
      }
    }
    return this.tree.slice(0)
    // console.log(JSON.stringify(this.tree))
  }

  /**
   * @param node {HtmlNode}
   */
  addNodeToParent(node: HtmlNode) {
    const p = this.lastElement(this.parentNodeStack)
    if (p) {
      p.pushChild(node)
    }
    this.parentNodeStack.push(node)
  }

  popNodeFromParent(): HtmlNode | undefined {
    const node = this.parentNodeStack.pop()
    if (this.parentNodeStack.length === 0 && node) {
      this.tree.push(node)
    }
    return node
  }

  lastElement<T>(arr: T[]): T | undefined {
    return arr[arr.length - 1]
  }

  resetText() {
    this.text = ''
  }

  setTextByChar(c: string) {
    this.text = this.text.concat(c)
  }

  static isAlphaChar(c: string) {
    const code = c.charCodeAt(0)
    return (code >= 97 && code <= 122) || (code >= 65 && code <= 90)
  }

  static isWhiteSpace(c: string) {
    return c === ' ' || c === '\n' || c === '\t'
  }

  setOffset(i: number) {
    this.offset = i
  }

  // offset 回退1
  backOffset() {
    this.setOffset(this.offset - 1)
  }

  nextChar() {
    return this.html[this.offset + 1]
  }

  beforeChar() {
    return this.html[this.offset - 1]
  }

  toString() {
    let text = ''
    this.tree.forEach((node) => {
      text = text + this.toStringHelper(node)
    })
    return text
  }

  toStringHelper(node: HtmlNode) {
    let text = ''
    if (node.isDocNode()) {
      text = node.getName()
    }
    if (node.isCommentNode()) {
      text = node.getName()
    }
    if (node.isTextNode()) {
      text = node.getName()
    }
    if (node.isEleNode()) {
      const name = node.getName()
      const nodeAttrs = node.getAttrs()
      const attrs = Object.keys(nodeAttrs).map((k) => {
        if (nodeAttrs[k] === true) {
          return k
        } else {
          return `${k}="${nodeAttrs[k]}"`
        }
      })
      text = '<' + name + (attrs.length > 0 ? ' ' + attrs.join(' ') : '')
      if (node.isSelfCloseTag()) {
        text = text + '/>'
        // over
        return text
      } else {
        text = text + '>'
      }
      // add children
      const children = node.getChildren()
      if (children.length > 0) {
        children.forEach((n) => {
          text = text + this.toStringHelper(n)
        })
      }
      text = `${text}</${name}>`
    }
    return text
  }

  fixOrderErrInParentStack(tagName: string) {
    let len = this.parentNodeStack.length
    while (len > 0) {
      if (this.parentNodeStack[len - 1].getName() === tagName) {
        break
      }
      len--
    }
    if (len === 0) {
      // 多余尾部标签 <div>xxxx</p></div>
      const node = new HtmlNode(tagName, HtmlNodeType.Element, this._start)
      // node.setName(tagName)
      // node.setTypeEle()
      // 添加层级关系
      this.addNodeToParent(node)
    }
    if (len > 0) {
      this.parentNodeStack = this.parentNodeStack.slice(0, len)
    }
  }
}
