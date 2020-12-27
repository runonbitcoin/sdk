/**
 * explore-tx.js
 */

class ExploreTx extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.shadowRoot.innerHTML = this.markup()
        this.shadowRoot.appendChild(document.createElement('style')).textContent = this.style()
    }

    get txid() { return this.getAttribute('txid') }
    set txid(value) { this.setAttribute('txid', value) }

    get network() { return this.getAttribute('network') }
    set network(value) { this.setAttribute('network', value) }

    connectedCallback() {
       this.network = this.network || 'main'
       this.txid = this.txid || ''
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

        if (!this.txid || !this.network) return

        this.container.style.display = 'flex'
        this.loadingSpinner.show()

        let rawtx, bsvtx, runtx, time, metadata, inputs, refs, outputs, deletes, masterList

        try {
            await serialize(async () => {
                const run = new Run({ network: this.network, trust: '*' })
                rawtx = await run.blockchain.fetch(this.txid)
                run.activate()
                runtx = await run.import(rawtx)
                bsvtx = new bsv.Transaction(rawtx)
                time = await run.blockchain.time(this.txid)
                metadata = Run.util.metadata(rawtx)
                inputs = []
                refs = []
                for (let i = 0; i < metadata.in; i++) {
                    const location = bsvtx.inputs[0].prevTxId.toString('hex') + '_o' + bsvtx.inputs[0].outputIndex
                    const creation = await run.load(location)
                    inputs.push(creation)
                }
                for (let i = 0; i < metadata.ref.length; i++) {
                    const location = metadata.ref[i]
                    const creation = await run.load(location)
                    refs.push(creation)
                }
                outputs = runtx.outputs
                deletes = runtx.deletes
                masterList = inputs.concat(refs).concat(runtx.outputs).concat(runtx.deletes)
            })
        } catch (e) {
            this.loadingSpinner.hide()
            this.searchError.text = e.message
            return
        }

        this.loadingSpinner.hide()
        this.result.style.display = 'flex'

        this.age.innerHTML = formatAge(new Date(time))
        this.code.innerHTML = this.buildPseudoCode(metadata, masterList)
        Prism.highlightElement(this.code)

        this.outputsHeader.style.display = 'none'
        this.outputsContent.innerHTML = ''

        if (outputs.length > 0) {
            this.outputsHeader.style.display = 'block'
            this.outputsHeader.innerHTML = `[${outputs.length} output${outputs.length !== 1 ? 's' : ''}]`
            outputs.forEach((creation, n) => this.append(this.outputsContent, creation, `${this.txid}_o${n + 1}`))
        }

        this.deletesHeader.style.display = 'none'
        this.deletesContent.innerHTML = ''
        
        if (deletes.length > 0) {
            this.deletesHeader.style.display = 'block'
            this.deletesHeader.innerHTML = `[${deletes.length} deleted]`
            deletes.forEach((creation, n) => this.append(this.deletesContent, creation, `${this.txid}_d${n}`))
        }
    }

    buildPseudoCode(metadata, masterList) {
        let code = ''
        for (const action of metadata.exec) {
            switch (action.op) {
                case 'DEPLOY': {
                    if (action.data.length > 2) {
                        const args = new Array(action.data.length / 2).fill('...').join(', ')
                        code += `run.deploy(${args})\n`
                    } else {
                        const type = action.data[0].split('{')[0] + '{ ... }'
                        code += `run.deploy(${type})\n`
                    }
                } break
                case 'UPGRADE': {
                    const orig = masterList[action.data[0].$jig].name
                    const type = action.data[1].split('{')[0] + '{ ... }'
                    code += `${orig}.upgrade(${type})\n`
                } break
                case 'NEW': {
                    const type = masterList[action.data[0].$jig].name
                    const args = new Array(action.data[1].length).fill('...').join(', ')
                    code += `new ${type}(${args})\n`
                } break
                case 'CALL': {
                    const creation = masterList[action.data[0].$jig]
                    const type = creation instanceof Run.Code ? creation.name : camelCase(creation.constructor.name)
                    const method = action.data[1]
                    const args = new Array(action.data[2].length).fill('...').join(', ')
                    code += `${type}.${method}(${args})\n`
                } break
            }
        }
        return code
    }

    append(container, creation, location) {
        const icon = extractIcon(creation)
        const name = extractName(creation)
        const kind = creation instanceof Run.Code ? creation.toString().startsWith('class') ? 'class' : 'function' :
            creation instanceof Run.Jig ? 'jig' : 'berry'
        
        const div = document.createElement('span')
        div.classList.add('creation')
        div.innerHTML = this.row()

        div.querySelector('#icon').innerHTML = icon
        div.querySelector('#name').innerHTML = name
        div.querySelector('#kind').innerHTML = kind

        if (!location.startsWith('native://')) {
            div.querySelector('#name').classList.add('clickable')
            const event = new CustomEvent('navigate', { detail: { query: location, network: this.network } })
            div.querySelector('#name').onclick = () => this.dispatchEvent(event)
        }

        container.appendChild(div)
    }

    markup() {
        return `
            <div id="container">
                <loading-spinner></loading-spinner>

                <search-error></search-error>

                <div id="result">
                    <span id="title">Transaction</span>
                    <div id="age"></div>

                    <hr/>

                    <pre><code class="language-javascript"></code></pre>

                    <hr/>

                    <div id="outputs-header" class="section-header">0 outputs</div>
                    <div id="outputs-content" class="section-content"></div>

                    <div id="deletes-header" class="section-header">0 deletes</div>
                    <div id="deletes-content" class="section-content"></div>
                </div>
            </div>
        `
    }

    row() {
        return `
            <span id="icon"></span>
            <span id="name"></span>
            <span id="kind"></span>
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

            #age {
                font-size: 18pt;
                font-weight: 800;
                margin-bottom: 20px;
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

            .section-header {
                width: 100%;
                text-align: center;
                font-size: 18pt;
                font-weight: 800;
                margin-top: 20px;
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
                text-align: center;
                font-size: 18pt;
                margin-bottom: 1em;
            }

            .creation .emoji {
                height: 18pt;
                transform: translateY(3pt);
                padding-right: 6pt;
            }

            .creation #name {
                color: #222;
                font-family: Consolas, monaco, monospace;
            }

            .creation .clickable {
                cursor: pointer;
                text-decoration: underline;
            }

            .creation #kind {
                color: #999;
            }

            hr {
                width: 100%;
            }

            #icon img {
                height: 16pt;
                border-radius: 4pt;
                transform: translateY(2pt);
            }
        `
    }

    get container() { return this.shadowRoot.getElementById('container') }
    get loadingSpinner() { return this.shadowRoot.querySelector('loading-spinner') }
    get searchError() { return this.shadowRoot.querySelector('search-error') }
    get result() { return this.shadowRoot.getElementById('result') }
    get age() { return this.shadowRoot.getElementById('age') }
    get pre() { return this.shadowRoot.querySelector('pre') }
    get code() { return this.shadowRoot.querySelector('code') }
    get outputsHeader() { return this.shadowRoot.getElementById('outputs-header') }
    get outputsContent() { return this.shadowRoot.getElementById('outputs-content') }
    get deletesHeader() { return this.shadowRoot.getElementById('deletes-header') }
    get deletesContent() { return this.shadowRoot.getElementById('deletes-content') }

    static get observedAttributes() { return ['txid', 'network'] }
}

customElements.define('explore-tx', ExploreTx)
