import HtmlParser from './htmlParser.mjs'

const text = `
<template>
  <div class="login">
    <div class="flex-1">
      <img src="@/assets/pics/login2.png" width="100%" height="100%" class="login2" alt/>
    </div>
    <div class="flex-1 pr">
      <div class="login-right">
        <div class="title">欢迎登录</div>
        <div class="sub-title">欢迎登录智慧校园管理系统</div>
        <div>
          <input type="text" placeholder="请输入账号" v-model="account" autofocus/>
        </div>
        <div>
          <input type="password" placeholder="请输入密码" v-model="pwd"/>
        </div>
        <div>
          <button class="login-btn" @click="login">登录</button>
        </div>
      </div>
      <div class="pa" style="top: 0;right: 10%;">
        <img src="@/assets/pics/login1.png" alt/>
      </div>
    </div>
  </div>
</template>
`

const parser = new HtmlParser()
parser.setHtml(text)
JSON.stringify(parser.exec())
