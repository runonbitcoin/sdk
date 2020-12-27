/**
 * loading-spinner.js
 */

class LoadingSpinner extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.shadowRoot.innerHTML = this.markup()
        this.shadowRoot.appendChild(document.createElement('style')).textContent = this.style()
    }

    show() { this.div.style.display = 'block' }
    hide() { this.div.style.display = 'none' }

    markup() {
        return `<div></div>`
    }

    style() {
        return `
            div {
                background-image: url(images/loading.gif);
                background-repeat: no-repeat;
                background-position: center;
                background-size: contain;
                width: 12em;
                height: 8em;
                display: none;
            }
        `
    }

    get div() { return this.shadowRoot.querySelector('div') }
}

customElements.define('loading-spinner', LoadingSpinner)
