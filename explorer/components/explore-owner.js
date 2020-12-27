/**
 * explore-owner.js
 */

class ExploreOwner extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.shadowRoot.innerHTML = this.markup()
        this.shadowRoot.appendChild(document.createElement('style')).textContent = this.style()
    }

    get address() { return this.getAttribute('address') }
    set address(value) { this.setAttribute('address', value) }

    get network() { return this.getAttribute('network') }
    set network(value) { this.setAttribute('network', value) }

    connectedCallback() {
       this.network = this.network || 'main'
       this.address = this.address || ''
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return

        this.loadAsync()
    }

    async loadAsync() {
        this.container.style.display = 'none'
        this.loadingSpinner.hide()
        this.nojigs.style.display = 'none'
        this.result.style.display = 'none'

        if (!this.network || !this.address) return

        this.container.style.display = 'flex'
        this.loadingSpinner.show()

        let jigs, code, classes, functions, dates

        await serialize(async () => {
            const run = new Run({ owner: this.address, network: this.network, trust: '*' })
            await run.inventory.sync()

            jigs = run.inventory.jigs
            code = run.inventory.code

            if (jigs.length === 0 && code.length === 0) {
                this.nojigs.style.display = 'block'
                return
            }

            classes = code.filter(C => C.toString().startsWith('class'))
            functions = code.filter(C => !C.toString().startsWith('class'))

            dates = new Map()
            const creations = jigs.concat(classes).concat(functions)
            const txids = creations.map(creation => creation.location.slice(0, 64))
            const txtimePromises = txids.map(txid => run.blockchain.time(txid))
            const txtimes = await Promise.all(txtimePromises)
            txtimes.map((time, n) => dates.set(creations[n], new Date(time)))
        })

        this.loadingSpinner.hide()
        this.result.style.display = 'flex'
        this.jigsHeader.style.display = 'none'
        this.jigsContent.innerHTML = ''
        this.classesHeader.style.display = 'none'
        this.classesContent.innerHTML = ''
        this.functionsHeader.style.display = 'none'
        this.functionsContent.innerHTML = ''

        if (jigs.length > 0) {
            this.jigsHeader.style.display = 'block'
            this.jigsHeader.innerHTML = `[${jigs.length} jig${jigs.length !== 1 ? 's' : ''}]`

            jigs.forEach(jig => this.append(this.jigsContent, jig, dates.get(jig)))
        }

        if (classes.length > 0) {
            this.classesHeader.style.display = 'block'
            this.classesHeader.innerHTML = `[${classes.length} class${classes.length !== 1 ? 'es' : ''}]`

            classes.forEach(C => this.append(this.classesContent, C, dates.get(C)))
        }
        
        if (functions.length > 0) {
            this.functionsHeader.style.display = 'block'
            this.functionsHeader.innerHTML = `[${functions.length} function${functions.length !== 1 ? 's' : ''}]`

            functions.forEach(f => this.append(this.functionsContent, f, dates.get(f)))
        }
    }

    append(container, creation, date) {
        const icon = extractIcon(creation)
        const name = extractName(creation)
        const age = `[${formatAge(date)}]`
        
        const div = document.createElement('div')
        div.classList.add('creation')
        div.innerHTML = this.row()

        div.querySelector('#icon').innerHTML = icon
        div.querySelector('#name').innerHTML = name
        div.querySelector('#age').innerHTML = age

        const event = new CustomEvent('navigate', { detail: { query: creation.location, network: this.network } })
        div.querySelector('#age').onclick = () => this.dispatchEvent(event)

        container.appendChild(div)
    }

    markup() {
        return `
            <div id="container">
                <loading-spinner></loading-spinner>

                <span id="nojigs">No jigs or code</span>

                <div id="result">
                    <span id="title">Owner</span>

                    <div id="jigs-header" class="section-header">0 jigs</div>
                    <div id="jigs-content" class="section-content"></div>

                    <div id="classes-header" class="section-header">0 classes</div>
                    <div id="classes-content" class="section-content"></div>

                    <div id="functions-header" class="section-header">0 functions</div>
                    <div id="functions-content" class="section-content"></div>
                </div>
            </div>
        `
    }

    row() {
        return `
            <span id="left">
                <span id="icon"></span>
                <span id="name"></span>
            </span>
            <span id="age"></span>
        `
    }

    style() {
        return `
            #container {
                width: 100%;
                display: none;
                flex-direction: column;
                align-items: center;
            }

            #nojigs {
                width: 100%;
                display: none;
            }

            #result {
                width: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
            }

            #title {
                font-size: 12pt;
            }

            .section-header {
                width: 100%;
                text-align: center;
                font-size: 18pt;
                font-weight: 800;
                margin-bottom: 20px;
            }

            .section-content {
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
            }

            .creation {
                width: 100%;
                display: flex;
                justify-content: center;
                font-size: 18pt;
                margin-bottom: 1.5em;
            }

            .creation #left {
                width: 40%;
                text-align: center;
                display: flex;
            }

            .creation .emoji {
                height: 18pt;
                transform: translateY(3pt);
                padding-right: 6pt;
            }

            .creation #name {
                text-align: center;
                color: #999;
                font-family: Consolas, monaco, monospace;
            }

            .creation #age {
                width: 40%;
                text-align: center;
                color: #222;
                cursor: pointer;
                text-decoration: underline;
            }

            #icon img {
                height: 16pt;
                border-radius: 4pt;
                margin: 4pt;
                transform: translateY(-2pt);
            }
        `
    }

    get container() { return this.shadowRoot.getElementById('container') }
    get loadingSpinner() { return this.shadowRoot.querySelector('loading-spinner') }
    get nojigs() { return this.shadowRoot.getElementById('nojigs') }
    get result() { return this.shadowRoot.getElementById('result') }
    get jigsHeader() { return this.shadowRoot.getElementById('jigs-header') }
    get jigsContent() { return this.shadowRoot.getElementById('jigs-content') }
    get classesHeader() { return this.shadowRoot.getElementById('classes-header') }
    get classesContent() { return this.shadowRoot.getElementById('classes-content') }
    get functionsHeader() { return this.shadowRoot.getElementById('functions-header') }
    get functionsContent() { return this.shadowRoot.getElementById('functions-content') }

    static get observedAttributes() { return ['address', 'network'] }
}

customElements.define('explore-owner', ExploreOwner)
