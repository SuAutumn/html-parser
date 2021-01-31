export default class HtmlParser {
  /**
   * @param html {string, undefined}
   */
  constructor (html) {
    if (html) {
      this.setHtml(html)
    }
    this.node = null // 子node
    this.parentNodeStack = [] // 父node
    this.text = '' // current text
    this.tree = []
  }

  setHtml (html) {
    this.html = html
    this.status = this.initState(this.html)
    this.offset = 0
    this.length = this.html.length
  }

  initState (html) {
    if (html.charAt(0) === '<') {
      return State.OpenTag
    } else {
      return State.Text
    }
  }

  handleOpenTag (c) {
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
    } else if (HtmlParser.isAlphaChar(c)) {
      // a-z
      this.status = State.OpenTagName
    } else if (HtmlParser.isWhiteSpace(c)) {
      // <    > ignore
    }
  }

  handleOpenTagName (c) {
    if (HtmlParser.isAlphaChar(c)) {
      this.status = State.OpeningTagName
    }
  }

  handleOpeningTagName (c) {
    if (HtmlParser.isAlphaChar(c)) {
      // 记录字符
      this.setTextByChar(c)
    } else if (HtmlParser.isWhiteSpace(c) || c === '>' || c === '/') {
      // <div ...>
      this.status = State.ClosedTagName
    }
  }

  handleClosedTagName (c) {
    this.node = new HtmlNode(this._start, this.html)
    this.node.setName(this.text)
    this.node.setTypeEle()
    this.resetText()
    this.status = State.BeforeOpenAttributeName
    // 添加层级关系
    if (this.parentNodeStack.length > 0) {
      this.parentNodeStack[this.parentNodeStack.length - 1].children.push(this.node)
    }
    this.parentNodeStack.push(this.node)
  }

  handleBeforeOpenAttributeName (c) {
    // <div class="..." style="...">
    if (HtmlParser.isAlphaChar(c) || c === '@') {
      this.status = State.OpeningAttributeName
    } else if (HtmlParser.isWhiteSpace(c)) {
      // ignore
    } else if (c === '/') {
      // <div/>
      this.status = State.BeforeCloseTag
    } else if (c === '>') {
      // <div>
      this.status = State.ClosingTag
    }
  }

  handleOpeningAttributeName (c) {
    // v-model="..."
    if (HtmlParser.isAlphaChar(c) || c === '-' || c === '@') {
      // 记录字符
      this.setTextByChar(c)
    } else if (HtmlParser.isWhiteSpace(c) || c === '=') {
      this.status = State.ClosedAttributeName
    }
  }

  handleClosedAttributeName (c) {
    this.node.setAttrName(this.text)
    this.resetText()
    if (HtmlParser.isWhiteSpace(c)) {
      // <div class style="...">
      this.status = State.BeforeOpenAttributeName
    } else if (c === '=') {
      this.status = State.BeforeOpenAttributeValue
    }
  }

  handleBeforeOpenAttributeValue (c) {
    if (this._quot) {
      this.status = State.OpeningAttributeValue
    } else if (HtmlParser.isWhiteSpace(c) || c === '=') {
      // ignore
    } else if (c === '"' || c === '\'') {
      this._quot = c
    } else {
      this.status = State.OpeningAttributeValue
    }
  }

  handleOpeningAttributeValue (c) {
    // class="xxxx"
    if (this._quot) {
      if (c === this._quot) {
        this.status = State.ClosingAttributeValue
        this._quot = undefined
      } else {
        this.setTextByChar(c)
      }
    } else if (HtmlParser.isWhiteSpace(c) || c === '/' || c === '>') {
      // class=xxxx
      this.status = State.ClosingAttributeValue
    } else {
      this.setTextByChar(c)
    }
  }

  handleClosingAttributeValue (c) {
    this.node.setAttrValue(this.text)
    this.resetText()
    this.status = State.ClosedAttributeValue
  }

  handleClosedAttributeValue (c) {
    if (HtmlParser.isWhiteSpace(c)) {
      this.status = State.BeforeOpenAttributeName
    } else if (c === '/') {
      // <div/>
      this.status = State.BeforeCloseTag
    } else if (c === '>') {
      // <div>
      this.status = State.ClosingTag
    }
  }

  handleBeforeCloseTag (c) {
    this.status = State.ClosingTag
  }

  handleClosingTag (c) {
    if (c === '/') {
      // ignore
      // 收尾
      this._parentNode = this.parentNodeStack.pop()
      if (this.parentNodeStack.length === 0) {
        this.tree.push(this._parentNode)
      }
    } else if (HtmlParser.isWhiteSpace(c)) {
      // ignore
    } else if (c === '>') {
      this.status = State.ClosedTag
    }
  }

  // >
  handleClosedTag (c) {
    if (c === '>') {
      // update end position
      if (this._parentNode) {
        // <div/>
        this._parentNode.setEnd(this.offset, this.html)
        this._parentNode = undefined
        this.node = null
      } else {
        // <meta> 检查是否是自闭合标签
        if (this.node.isSelfCloseTag()) {
          // 收尾
          this.parentNodeStack.pop()
          this.node.setEnd(this.offset, this.html)
          if (this.parentNodeStack.length === 0) {
            this.tree.push(this.node)
          }
          this.node = null
        }
      }
    } else if (c === '<') {
      this.status = State.OpenTag
      // 回退1
      this.setOffset(this.offset - 1)
    } else {
      this.status = State.Text
    }
  }

  handleText (c) {
    if (c === this._quot) {
      this._quot = undefined
    } else if (!this._quot && (c === '"' || c === '\'')) {
      // 没有设置过 _quote 才可以
      this._quot = c
    }
    if (!this._quot && c === '<') {
      this.node = new HtmlNode(this.offset - this.text.length, this.html)
      this.node.setTypeText()
      this.node.setName(this.text)
      this.node.setEnd(this.offset - 1, this.html)
      this.resetText()
      // 添加层级关系
      this.linkToParentNode(this.node)
      this.status = State.OpenTag
      // 回退1
      this.setOffset(this.offset - 1)
    } else {
      this.setTextByChar(c)
    }
  }

  handleOpenDoctype (c) {
    if (c === '>') {
      const node = new HtmlNode(this._start, this.html)
      node.setTypeDoc()
      node.setName(this.html.slice(this._start, this.offset + 1))
      node.setEnd(this.offset, this.html)
      this.status = State.ClosedTag
      this.linkToParentNode(node)
    }
  }

  handleOpenCommentTag (c) {
    if (this.beforeChar() === '-' && c === '>') {
      const node = new HtmlNode(this._start, this.html)
      node.setTypeComment()
      node.setName(this.html.slice(this._start, this.offset + 1))
      node.setEnd(this.offset, this.html)
      this.status = State.ClosedTag
      // 添加层级关系
      this.linkToParentNode(node)
    }
  }

  exec () {
    while (this.offset < this.length) {
      const c = this.html[this.offset]
      if (this.status === State.OpenTag) {
        this.handleOpenTag(c)
      }
      if (this.status === State.OpenCommentTag) {
        this.handleOpenCommentTag(c)
      }
      if (this.status === State.OpenDoctype) {
        this.handleOpenDoctype(c)
      }
      if (this.status === State.OpenTagName) {
        this.handleOpenTagName(c)
      }
      if (this.status === State.OpeningTagName) {
        this.handleOpeningTagName(c)
      }
      if (this.status === State.ClosedTagName) {
        this.handleClosedTagName(c)
      }
      if (this.status === State.BeforeOpenAttributeName) {
        this.handleBeforeOpenAttributeName(c)
      }
      if (this.status === State.OpeningAttributeName) {
        this.handleOpeningAttributeName(c)
      }
      if (this.status === State.ClosedAttributeName) {
        this.handleClosedAttributeName(c)
      }
      if (this.status === State.BeforeOpenAttributeValue) {
        this.handleBeforeOpenAttributeValue(c)
      }
      if (this.status === State.OpeningAttributeValue) {
        this.handleOpeningAttributeValue(c)
      }
      if (this.status === State.ClosingAttributeValue) {
        this.handleClosingAttributeValue(c)
      }
      if (this.status === State.ClosedAttributeValue) {
        this.handleClosedAttributeValue(c)
      }
      if (this.status === State.BeforeCloseTag) {
        this.handleBeforeCloseTag(c)
      }
      if (this.status === State.ClosingTag) {
        this.handleClosingTag(c)
      }
      if (this.status === State.ClosedTag) {
        this.handleClosedTag(c)
      }
      if (this.status === State.Text) {
        this.handleText(c)
      }
      this.offset++
      console.log(this.parentNodeStack)
    }
    return this.tree
  }

  resetText () {
    this.text = ''
  }

  setTextByChar (c) {
    this.text = this.text.concat(c)
  }

  static isAlphaChar (c) {
    const code = c.charCodeAt(0)
    return code >= 97 && code <= 122
  }


  static isWhiteSpace (c) {
    return c === ' ' || c === '\n' || c === '\t'
  }

  setOffset (i) {
    this.offset = i
  }

  nextChar () {
    return this.html[this.offset + 1]
  }

  beforeChar () {
    return this.html[this.offset - 1]
  }

  linkToParentNode (node) {
    // 添加层级关系
    if (this.parentNodeStack.length > 0) {
      this.parentNodeStack[this.parentNodeStack.length - 1].children.push(node)
    } else {
      this.tree.push(node)
    }
  }
}

class HtmlNode {
  constructor (start, html) {
    // this.html = html
    this.start = start
    this.end = start
    this.name = ''
    this.type = '' // comment element text
    this.attrs = {}
    this._currentAttrName = ''
    this.children = []
  }

  // 单个连接字符
  setName (name) {
    this.name = name
  }

  getName () {
    return this.name
  }

  setAttrName (name) {
    this.attrs[name] = ''
    this._currentAttrName = name
  }

  setAttrValue (value) {
    if (this._currentAttrName) {
      this.attrs[this._currentAttrName] = value
    }
  }

  setEnd (end, html) {
    this.end = end
    this.rawText = html.slice(this.start, this.end + 1)
  }

  setStart (start) {
    this.start = start
  }

  setTypeText () {
    this.type = 'text'
  }

  setTypeEle () {
    this.type = 'element'
  }

  setTypeComment () {
    this.type = 'comment'
  }

  setTypeDoc () {
    this.type = 'Doctype'
  }

  // 自闭合标签
  isSelfCloseTag () {
    return SelfCloseTags.indexOf(this.name) > -1
  }

  // 标签内所有内容按照文本处理
  isKeepInnerText () {
    if (this.name === 'script' || this.name === 'css') {
      return true
    }
  }

  toString () {
    return {
      name: this.name,
      start: this.start,
      end: this.end,
      attrs: this.attrs,
      text: text.slice(this.start, this.end + 1)
    }
  }
}

class State {
  static OpenTag = 0
  static OpenTagName = 1
  static OpeningTagName = 2
  static ClosedTagName = 3

  static BeforeOpenAttributeName = 4
  static OpeningAttributeName = 5
  static ClosedAttributeName = 6
  static BeforeOpenAttributeValue = 7
  static OpeningAttributeValue = 8
  static ClosingAttributeValue = 9
  static ClosedAttributeValue = 10

  static BeforeCloseTag = 11
  static ClosingTag = 12
  static ClosedTag = 13

  static Text = 14

  static OpenDoctype = 15
  static OpenCommentTag = 16
}

const SelfCloseTags = [
  'meta',
  'link',
  'br',
  'hr',
  'img',
  'input'
]

// const text = `
// <p>贺岁档还没有打响，捷成股份倒提前给A股市场献上了“一出好戏”。</p><br/><p>12月30日早间，捷成股份公告，公司拟披露重大事项，公司股票于2020年12月30日开市起停牌。</p><br/><p>在此之前的3个交易日，捷成股份股价出现闪崩，累计跌幅逾30%。广大投资者不禁要问：公司葫芦里卖的究竟是什么药？</p><br/><p>↵<strong>实控人信托违约遭起诉</strong>↵</p><br/><p>资料显示，捷成股份是一家从事音视频整体解决方案设计、开发与实施的企业，曾参与投资《红海行动》《一出好戏》等多部影片。今年9月以来，公司股价便一路下行，在股价闪崩前已累计下跌超过三成。而引爆其股价近三日闪崩的，则是12月25日的一份公司公告。</p><br/><p>这是一则关于公司控股股东徐子泉卷入了一起信托违约案件的公告。公告显示，公司控股股东徐子泉、康宁夫妇收到广州市中级人民法院送达的传票，案由为合伙企业财产份额转让纠纷。本次诉讼将于2021年1月15日进行证据交换。</p><br/><p>据公告披露，2017年5月11日，徐子泉与渤海国际信托签订《补仓及远期合伙企业财产份额转让合同》，渤海信托成立“渤海信托·中金君合单一资金信托计划”，信托资金为不超过12.3亿元，用于向北京中金君合创业投资中心（有限合伙）（简称“中金君合”）提供贷款。</p><br/><p>根据协议，徐子泉同意为该信托计划项下的投资及贷款本金和收益提供补仓义务和差额补足义务，并同意在信托计划到期时溢价受让渤海信托持有的中金君合有限合伙份额。</p><br/><p>公开资料显示，中金君合将上述资金用于认购新潮能源定向增发，其出资11.12亿元认购了3.746亿股，成本价为2.97元/股。</p><br/><p>然而，自此次定增之后，新潮能源股价一路下跌，截至今年12月25日已跌至1.58元/股。据此计算，中金君合账面亏损约5.20亿元。</p><br/><p>新潮能源2017-2020年股价</p><br/><p>但是，据公告披露，徐子泉在信托存续期间并未履行相应的补仓、差额补足义务。据此，渤海信托向广州市中级人民法院起诉，要求法院判令徐子泉支付合伙份额受让价款（即信托计划本金与受让合伙份额溢价款之和）17.53亿元和支付相应违约金。受此案影响，徐子泉所持有的捷成股份遭到司法冻结，被冻结股份占其所持公司股份总数的51.33%，占公司总股本的10.10%。</p><br/><p>↵<strong>值得注意的是，据这份12月25日披露的公告，此次司法冻结发生在11月9日。这意味着，上市公司对此未能及时公告。</strong>↵</p><br/><p>为此，深交所对公司下发了关注函。</p><br/><p>尽管捷成股份发布公告称“经向控股股东核实，控股股东涉诉系其个人债务纠纷所致，不会对公司本期利润或期后利润造成影响”，但市场显然并不买账，公司股价由此在3日内闪崩超30%。</p><br/><p>↵<strong>商誉减值悬顶 公司经营堪忧</strong>↵</p><br/><p>不仅仅是实控人的涉诉，眼下捷成股份的经营也堪忧。</p><br/><p>公司财报显示，受疫情的影响，公司今年前三季度实现归属于上市公司股东的净利润2.05亿元，同比下降33.34%。</p><br/><p>更为令人担忧的是，捷成股份旗下的华视网聚蕴含着一个巨大隐忧。财报显示，截至今年三季度末，捷成股份账面商誉余额为30.52亿元，其中华视网聚背负的商誉达29.80亿元。</p><br/><p>华视网聚今年上半年的营业收入达10.23亿元，占了捷成股份同期13.23亿元营收的77%。</p><br/><p>高企的商誉是此前公司激进扩张的遗留问题。回溯历史，捷成股份上市早期的高速增长，基本源自不断的兼并。据有关报道，2012年至2018年期间，捷成股份相继收购公司超20家，交易总价超80亿元，截至2017年三季度末，公司商誉余额一度高达55.54亿元。</p><br/><p>然而，自2017年开始，随着早年收购标的业绩承诺期纷纷完成，业绩开始“变脸”。2018年，捷成股份营业收入50.28亿元，同比增长15.17%，而净利润只有0.94亿元，同比下降91.28%。2019年，公司合计计提的商誉减值高达16.6亿元。</p><br/><p>投资者不禁担忧：华视网聚作为公司营收的主要贡献者，是否会重蹈覆辙？</p><br/><p>公司经营堪忧的背后，却是公司控股股东徐子泉的疯狂减持。数据显示，2020年以来，捷成股份高管共计8次减持中，徐子泉占了7次，合计套现2.3亿元。</p><br/><p>此外，数据统计，仅2020年以来，徐子泉就有7笔公告的股权质押。在此次司法冻结之前，其总质押比例达到持股数的42.11%。</p><br/><p>与此同时，天眼查数据显示，目前徐子泉担任高管的公司中，超半数处于注销或吊销的状态。</p><br/><p>­­</p><br/><p></p><br/><p>如此窘境下，尽管捷成股份借由重大事项紧急停牌，但这一出戏究竟有何精彩桥段，能否止住公司股价的闪崩，实在让人捏一把汗。</p><br/><p>编辑：邱江</p><br/><p></p>
// `

const text = `
<!DOCTYPE html>
<html>
<!--<div>hello</div>-->
<div>hello</div>

</html>
123
`
// new HtmlParser(text).exec()



