/**
 * explore-creation.js
 */

class ExploreCreation extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.shadowRoot.innerHTML = this.markup()
        this.shadowRoot.appendChild(document.createElement('style')).textContent = this.style()
    }

    get location() { return this.getAttribute('location') }
    set location(value) { this.setAttribute('location', value) }

    get network() { return this.getAttribute('network') }
    set network(value) { this.setAttribute('network', value) }

    connectedCallback() {
       this.network = this.network || 'main'
       this.location = this.location || ''
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return

        this.loadAsync()
    }

    async loadAsync() {
        this.container.style.display = 'none'
        this.loadingSpinner.hide()
        this.searchError.text = ''
        this.result.style.display = 'none'

        if (!this.location || !this.network) return

        this.container.style.display = 'flex'
        this.loadingSpinner.show()

        let creation, time, rawtx, prevLocation, nextLocation

        await serialize(async () => {
            try {
                const run = new Run({ network: this.network, trust: '*' })

                creation = await run.load(this.location)
                time = await run.blockchain.time(this.location.slice(0, 64))
                rawtx = await run.blockchain.fetch(this.location.slice(0, 64))

                prevLocation = null
                nextLocation = null

                if (creation.nonce > 1) {
                    const metadata = Run.util.metadata(rawtx)
                    const bsvtx = new bsv.Transaction(rawtx)
                    for (let i = 0; i < metadata.in; i++) {
                        const location = `${bsvtx.inputs[i].prevTxId.toString('hex')}_o${bsvtx.inputs[i].outputIndex}`
                        const prevCreation = await run.load(location)
                        if (prevCreation.origin === creation.origin) {
                            prevLocation = location
                            break
                        }
                    }
                }

                if (creation.owner !== null) {
                    const spendtxid = await run.blockchain.spends(this.location.slice(0, 64), parseInt(this.location.slice(66)))
                    if (spendtxid) {
                        const spendraw = await run.blockchain.fetch(spendtxid)
                        const spendtx = await run.import(spendraw)
                        const sameOrigin = (x, y) => { try { return x.origin === y.origin } catch (e) { return false } }
                        const vout = spendtx.outputs.findIndex(x => sameOrigin(x, creation))
                        const vdel = spendtx.deletes.findIndex(x => sameOrigin(x, creation))
                        if (vout !== -1) nextLocation = `${spendtxid}_o${vout + 1}`
                        if (vdel !== -1) nextLocation = `${spendtxid}_d${vdel}`
                    }
                }
            } catch (e) {
                this.loadingSpinner.hide()
                this.searchError.text = e.message
                return
            }
        })

        this.loadingSpinner.hide()
        this.result.style.display = 'flex'

        if (creation instanceof Run.Jig) {
            this.title.innerHTML = 'Jig'
        } else if (creation instanceof Run.Code) {
            this.title.innerHTML = creation.toString().startsWith('class') ? 'Class' : 'Function'
        } else if (creation instanceof Run.Berry) {
            this.title.innerHTML = 'Berry'
        } else {
            this.searchError.text = "Creation cannot be displayed"
            return
        }

        this.icon.innerHTML = extractIcon(creation)
        const image = extractImage(creation) || extractImage(creation.constructor)
        this.icon.onclick = image ? () => this.dispatchEvent(
            new CustomEvent('navigate', { detail: { query: image.location, network: this.network } })) : null
        if (image) { this.icon.classList.add('clickable') } else { this.icon.classList.remove('clickable') }

        this.kind.innerHTML = extractName(creation)
        this.age.innerHTML = formatAge(new Date(time))
        const txEvent = new CustomEvent('navigate', { detail: { query: creation.location.slice(0, 64), network: this.network }})
        this.age.onclick = () => this.dispatchEvent(txEvent)
        this.method.innerHTML = formatMethod(rawtx)

        this.prev.style.visibility = prevLocation ? 'visible' : 'hidden'
        this.next.style.visibility = nextLocation ? 'visible' : 'hidden'
        this.prev.onclick = prevLocation ? () => this.dispatchEvent(new CustomEvent('navigate', { detail: { query: prevLocation, network: this.network }})) : null
        this.next.onclick = nextLocation ? () => this.dispatchEvent(new CustomEvent('navigate', { detail: { query: nextLocation, network: this.network }})) : null

        if (creation instanceof Run.Jig || creation instanceof Run.Berry) {
            this.kind.classList.add('classKind')
            const event = new CustomEvent('navigate', { detail: { query: creation.constructor.location, network: this.network } })
            this.kind.onclick = () => this.dispatchEvent(event)
        } else {
            this.kind.classList.remove('classKind')
        }

        const bindings = ['origin', 'location', 'nonce', 'owner', 'satoshis']
        const metadata = ['metadata', 'deps']
        const hidden = bindings.concat(metadata)
        const keys = Object.keys(creation).filter(x => !hidden.includes(x))

        if (creation instanceof Run.Code) {
            this.codeHeader.style.display = 'block'
            this.pre.style.display = 'block'
            this.code.innerHTML = creation.toString()
            Prism.highlightElement(this.code)
        } else {
            this.codeHeader.style.display = 'none'
            this.pre.style.display = 'none'
        }

        if (keys.length){
            this.propsHeader.style.display = 'block'
            this.props.style.display = 'block'
            this.props.innerHTML = ''
            keys.forEach(key => {
                const div = document.createElement('div')
                div.classList.add('prop')
                div.innerHTML = this.prop()

                div.querySelector('#name').innerHTML = key
                div.querySelector('#value').innerHTML = creation[key]

                this.props.appendChild(div)
            })
        } else {
            this.propsHeader.style.display = 'none'
            this.props.style.display = 'none'
        }

        const address = parseAddress(creation.owner, this.network)
        if (address) {
            const miniaddress = `${address.slice(0, 5)}...${address.slice(address.length - 5)}`
            const event = new CustomEvent('navigate', { detail: { query: address, network: this.network } })

            this.footer.style.display = 'block'
            this.owner.style.display = 'block'
            this.owner.innerHTML = miniaddress
            this.owner.onmouseover = () => { this.owner.innerHTML = address }
            this.owner.onmouseout = () => { this.owner.innerHTML = miniaddress }
            this.owner.onclick = () => this.dispatchEvent(event)
        } else {
            this.footer.style.display = 'none'
            this.owner.style.display = 'none'
        }
    }

    markup() {
        return `
            <div id="container">
                <loading-spinner></loading-spinner>

                <search-error></search-error>

                <div id="result">
                    <div id="title"></div>
                    <div id="icon"></div>
                    <div id="kind"></div>
                    <div id="age"></div>
                    <div id="navigator">
                        <div id="prev"></div>
                        <div id="method"></div>
                        <div id="next"></div>
                    </div>
                    <hr id="code-header"/>
                    <pre><code class="language-javascript"></code></pre>
                    <hr id="props-header"/>
                    <div id="props"></div>
                    <hr/>
                    <span id="footer">owned by</span>
                    <div id="owner"></div>
                </div>
            </div>
        `
    }

    prop() {
        return `
            <div id="name"></div>
            <div id="value"></div>
        `
    }

    style() {
        return `
            @import "styles/prism.css";

            #container {
                width: 100%;
                display: none;
                flex-direction: column;
                align-items: center;
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

            #icon .emoji {
                height: 32pt;
                padding: 6pt;
            }

            #icon img {
                height: 64pt;
                padding: 6pt;
                border-radius: 16pt;
            }

            #kind {
                font-size: 18pt;
                font-weight: 800;
                margin-bottom: 20px;
            }

            .classKind {
                cursor: pointer;
                text-decoration: underline;
            }

            #navigator {
                width: 100%;
                display: flex;
                justify-content: center;
                margin-bottom: 0.8em;
            }

            #prev {
                width: 0.8em;
                background-image: url("images/left.svg");
                background-repeat: no-repeat;
                background-size: contain;
                background-position: center;
                margin-right: 1.5em;
                visibility: hidden;
                cursor: pointer;
                text-decoration: underline;
            }

            #next {
                width: 0.8em;
                background-image: url("images/right.svg");
                background-repeat: no-repeat;
                background-size: contain;
                background-position: center;
                margin-left: 1.5em;
                visibility: hidden;
                cursor: pointer;
                text-decoration: underline;
            }

            #age {
                color: #222;
                font-size: 12pt;
                cursor: pointer;
                text-decoration: underline;
                margin-bottom: 0.8em;
            }

            #method {
                color: #222;
                font-size: 18pt;
                font-weight: 800;
                font-family: Consolas, monaco, monospace;
            }

            pre {
                width: 100%;
                text-align: center !important;
                margin: 20px 0 !important;
                font-size: 12pt !important;
            }

            code {
                text-align: left;
                display: inline-block;
            }

            #props {
                width: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 1em;
                font-size: 12pt;
            }

            .prop {
                width: 100%;
                display: flex;
                justify-content: center;
            }

            .prop #name {
                width: 40%;
                text-align: center;
                color: #0097ff;
                font-family: Consolas, monaco, monospace;
                font-size: 18pt;
                margin: 0.7em;
            }

            .prop #value {
                width: 40%;
                text-align: center;
                color: #ff40ff;
                font-family: Consolas, monaco, monospace;
                width: 30%;
                font-size: 18pt;
                margin: 0.7em;
            }

            #footer {
                margin-top: 0.5em;
                font-size: 12pt;
            }

            #owner {
                margin-top: 1em;
                font-size: 18pt;
                font-style: italic;
                cursor: pointer;
                text-decoration: underline;
            }

            hr {
                width: 100%;
            }

            .clickable {
                cursor: pointer;
                text-decoration: underline;
            }
        `
    }

    get container() { return this.shadowRoot.getElementById('container') }
    get loadingSpinner() { return this.shadowRoot.querySelector('loading-spinner') }
    get searchError() { return this.shadowRoot.querySelector('search-error') }
    get result() { return this.shadowRoot.getElementById('result') }
    get title() { return this.shadowRoot.getElementById('title') }
    get icon() { return this.shadowRoot.getElementById('icon') }
    get kind() { return this.shadowRoot.getElementById('kind') }
    get age() { return this.shadowRoot.getElementById('age') }
    get prev() { return this.shadowRoot.getElementById('prev') }
    get next() { return this.shadowRoot.getElementById('next') }
    get method() { return this.shadowRoot.getElementById('method') }
    get codeHeader() { return this.shadowRoot.getElementById('code-header') }
    get pre() { return this.shadowRoot.querySelector('pre') }
    get code() { return this.shadowRoot.querySelector('code') }
    get propsHeader() { return this.shadowRoot.getElementById('props-header') }
    get props() { return this.shadowRoot.getElementById('props') }
    get footer() { return this.shadowRoot.getElementById('footer') }
    get owner() { return this.shadowRoot.getElementById('owner') }

    static get observedAttributes() { return ['location', 'network'] }
}

customElements.define('explore-creation', ExploreCreation)
