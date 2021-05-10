import { SELF_CLOSE_TAGS } from './const'

export enum HtmlNodeType {
  /** 初始值 */
  Default,
  /** 文本 */
  Text,
  /** 注释 */
  Comment,
  /** html 标签 */
  Element,
  /** 文档类型 标签 */
  Doctype,
}

export default class HtmlNode {
  /** 记录标签属性 */
  private static currentAttrName = ''
  private end = 0

  private attrs: Record<string, string | boolean> = {}
  private children: HtmlNode[] = []
  private rawText?: string
  /**
   * 创建node
   * @param name 标签名称
   * @param type 标签类型
   * @param start 在原始文本开始位置
   */
  constructor(
    readonly name: string,
    readonly type: HtmlNodeType,
    readonly start: number
  ) {
    this.name = name
    this.type = type
    this.start = start
    this.end = start
  }

  getName() {
    return this.name
  }

  setAttrName(name: string) {
    this.attrs[name] = true
    HtmlNode.currentAttrName = name
  }

  setAttrValue(value: string) {
    if (HtmlNode.currentAttrName) {
      this.attrs[HtmlNode.currentAttrName] = value
    }
  }

  setEnd(end: number, html: string) {
    this.end = end
    this.rawText = html.slice(this.start, this.end + 1)
  }

  isTextNode() {
    return this.type === HtmlNodeType.Text
  }

  isEleNode() {
    return this.type === HtmlNodeType.Element
  }

  isCommentNode() {
    return this.type === HtmlNodeType.Comment
  }

  isDocNode() {
    return this.type === HtmlNodeType.Doctype
  }

  /** 是否是自闭合标签 */
  isSelfCloseTag() {
    return SELF_CLOSE_TAGS.indexOf(this.name) > -1
  }

  /** 是否是<script>标签，如果是则标签内所有内容按照文本处理 */
  isScript() {
    return this.name === 'script'
  }

  pushChild(n: HtmlNode) {
    this.children.push(n)
  }

  getChildren() {
    return this.children
  }

  getAttrs() {
    return this.attrs
  }

  querySelect(cb: (val: HtmlNode) => boolean): null | HtmlNode {
    let r: HtmlNode | null = null
    for (let i = 0, len = this.children.length; i < len; i++) {
      const node = this.children[i]
      if (cb(node)) {
        r = node
      } else {
        r = node.querySelect(cb)
      }
      if (r) break
    }
    return r
  }
}
