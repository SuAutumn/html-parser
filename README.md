### [html-parser](https://gitee.com/gitee_zhangp/js-utils/tree/master/utils/html-paser)

#### 功能
  * 实现html词法分析，将html结构文件转换为对应层级的json数据，可以修改数据并生成新的html文件。
    ```javascript
    // 参考
    <div class="text-white" style="color: white;">hello</div>
    // 转化为
    {
      name: 'div',
      tag: 'element',
      attrs: { class: 'text-white', style: 'color: white' },
      children: [{
        name: 'hello',
        tag: 'text',
        children: []
      }]
    }
    ```
  * 其中$on方法可以监听标签打开和关闭事件，并接受回调函数处理自定义逻辑。
  * 兼容处理未合法闭合的标签。

