# protocol_tester

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Customize configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

## Project Setup

```sh
npm install
```

### UI only: Compile and Hot-Reload for Development

```sh
npm run dev
```

### UI only: Compile and Minify for Production

```sh
npm run build
```

### ELECTRON & UI : Compile and Hot-Reload for Development

```sh
npm run electron:dev
```

###  ELECTRON & UI: build distributable

```sh
npm run make
```

### try the following if network is "bad"
1. scientific surfing...
2. set envionment variable as: $env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"  (powershell)
3. npm config set proxy as: npm config set registry=https://registry.npmmirror.com
4. use cnpm to replace npm. to install: npm install -g cnpm --registry=https://registry.npmmirror.com