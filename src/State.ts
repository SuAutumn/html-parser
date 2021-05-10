enum State {
  OpenTag,
  OpenTagName,
  OpeningTagName,
  ClosedTagName,

  BeforeOpenAttributeName,
  OpeningAttributeName,
  ClosedAttributeName,
  BeforeOpenAttributeValue,
  OpeningAttributeValue,
  ClosingAttributeValue,
  ClosedAttributeValue,

  BeforeCloseTag,
  ClosingTag,
  ClosedTag,

  Text,
  /** 打开html doctype */
  OpenDoctype,
  OpenCommentTag,

  OpeningScript,
}

export default State
