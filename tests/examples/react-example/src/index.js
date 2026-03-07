// @ts-check

/* eslint-disable import/no-unassigned-import */
import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'
import reportWebVitals from './reportWebVitals'

/** @type {HTMLElement | null} */
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Expected #root element to be present')
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  rootElement
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
void reportWebVitals()
