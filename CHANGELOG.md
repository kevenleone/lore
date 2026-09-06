# Changelog

## [1.1.1](https://github.com/kevenleone/lore/compare/v1.1.0...v1.1.1) (2026-09-06)


### Refactoring

* build the settings controls from Tailwind utilities ([7d638b3](https://github.com/kevenleone/lore/commit/7d638b3a520ae24ab9337149d4ed861191bfff52))
* draw Ask Lore with Tailwind and retire util.css.ts ([9fcf8cc](https://github.com/kevenleone/lore/commit/9fcf8ccf05fdeba467336f6857755bf920a82aa1))
* draw the calendar, onboarding and app shell with Tailwind ([e0d93de](https://github.com/kevenleone/lore/commit/e0d93de3927939e3f839761336864bbaee7a97a3))
* draw the capture surfaces with Tailwind ([6595ebf](https://github.com/kevenleone/lore/commit/6595ebfebdb1bf9f112f28335516847b02ac2aaf))
* draw the cards, banners and view pickers with Tailwind ([988b174](https://github.com/kevenleone/lore/commit/988b1747bbf7114e7bac83d3a3394eec54a6f2d4))
* draw the detail pane and collections with Tailwind ([7e46c6b](https://github.com/kevenleone/lore/commit/7e46c6b15623dd7c716470fcab3b0a9d57b40404))
* draw the focus surfaces with Tailwind ([9742758](https://github.com/kevenleone/lore/commit/9742758224a26aade7f482e83a4671affa071c87))
* draw the list, table and their rows with Tailwind ([7082907](https://github.com/kevenleone/lore/commit/7082907d3478de904ef992c3b4e90b9d7444653a))
* draw the properties panel with Tailwind ([69cccdb](https://github.com/kevenleone/lore/commit/69cccdb6ed4b8ed9d5417fdeb35f024c32ac083e))
* draw the settings sheet and panes with Tailwind ([b57cc08](https://github.com/kevenleone/lore/commit/b57cc08133d34fcdac7134376cb8babd0b71f62c))
* draw the sidebar with Tailwind utilities ([48d5116](https://github.com/kevenleone/lore/commit/48d5116a3fe4ac37ad9854b13b1399bebebbdd94))
* draw the title bar, filters and workspace switcher with Tailwind ([13a6e2f](https://github.com/kevenleone/lore/commit/13a6e2fc8913315422c71630aa086d302009f05c))
* draw the tooltip with Tailwind utilities ([fdd93c1](https://github.com/kevenleone/lore/commit/fdd93c12889ea41743660a191a40edffe8004cff))
* paint the theme tokens onto the document root ([c6ca5ec](https://github.com/kevenleone/lore/commit/c6ca5ec14aedde2dc03314a8ca64d6e9f0e5f85e))


### Documentation

* add screenshots rendered from the design sources ([9245b35](https://github.com/kevenleone/lore/commit/9245b3514dfe05f49abee7e6a564c00f82254040))
* record the styling conventions Tailwind introduced ([6c51484](https://github.com/kevenleone/lore/commit/6c514849bba431eb4e43493ec3b4296267e9693f))
* rewrite the README around the design mocks ([310831a](https://github.com/kevenleone/lore/commit/310831a1459814d9eb1c9a5be633f305d368ddcb))


### Build System

* set up Tailwind CSS v4 over the existing theme tokens ([bf5dd70](https://github.com/kevenleone/lore/commit/bf5dd70ec58f960bf0c3d6590784fd2c41dd72f7))

## [1.1.0](https://github.com/kevenleone/lore/compare/v1.0.0...v1.1.0) (2026-09-05)

### Features

- add a properties side panel ([4a7c3cb](https://github.com/kevenleone/lore/commit/4a7c3cb3e1345fe46f96dda00bf3a1d32cf3bc62))
- adopt the Open seal mark as the app icon ([5bcbe58](https://github.com/kevenleone/lore/commit/5bcbe5801feceaac5c1fbad319e7509d86aef1fb))
- capture from a drawer when Lore is already open ([d5b3626](https://github.com/kevenleone/lore/commit/d5b3626eff9cde3558daadcc15f529eceb06c4d0))
- filter the library by category, tag, collection and date ([2b8ec70](https://github.com/kevenleone/lore/commit/2b8ec70ab1a2377fddec17b3f61e54b9c2c7fd36))
- label the title bar's icon buttons on hover ([2017609](https://github.com/kevenleone/lore/commit/20176095191a5cb7da23190d259b9e6d93c4e35a))
- notify when a focus interval ends ([56bbf05](https://github.com/kevenleone/lore/commit/56bbf05254deedce6501f2af93638e5e68bb835d))
- read comments, file stats and backlinks from the vault ([f1191dd](https://github.com/kevenleone/lore/commit/f1191dd3ddc380e4fc86368442aef120501a8a04))

### Bug Fixes

- do not let item images start a native drag ([292d6e2](https://github.com/kevenleone/lore/commit/292d6e2a0df66bd72d67eb9525ec558cc1d82ebe))

### Refactoring

- never let the page itself scroll ([5d0dbf5](https://github.com/kevenleone/lore/commit/5d0dbf52768fbf3db00a17bc150892788c5de8cf))

### Build System

- add the Tauri notification plugin ([e5692a6](https://github.com/kevenleone/lore/commit/e5692a6e5bf8ed17e9c24f3a385c8b0b40cfffa0))
- let the sidecar build script target a specific triple ([0552db9](https://github.com/kevenleone/lore/commit/0552db939945560138aba120bf3732ccc88b1c14))

## [1.0.0](https://github.com/kevenleone/lore/compare/v0.1.0...v1.0.0) (2026-09-05)

### ⚠ BREAKING CHANGES

- Markdown files replace SQLite as the source of truth. A launch with an empty vault imports lore.db and renames it to lore.db.premigration rather than deleting it.
- the SQLite database is renamed baloon.db to lore.db, so an existing local library is not found under the new name.

### Features

- add items to the focus queue from the session surface ([69e00f2](https://github.com/kevenleone/lore/commit/69e00f2d5977304554f3833df9c2b172bf72c41c))
- add the calendar view with day, week, and month grids ([b3e0a53](https://github.com/kevenleone/lore/commit/b3e0a539a392f2e6cff4ecb4dc48511c54627c90))
- add the data engine skeleton with token auth and handshake ([83b888c](https://github.com/kevenleone/lore/commit/83b888c6818e4184f2c28ae088d57ed7b9f37831))
- add the focus popover and focus mode surfaces ([22a4872](https://github.com/kevenleone/lore/commit/22a4872384e5f7196373a3367eb7a5a8931ab022))
- add the focus timer, calendar scheduling, and main-view state to the store ([f878253](https://github.com/kevenleone/lore/commit/f878253daa16213e1c4e481f2cc42e5fe9480182))
- add the keyboard map as a second take in the shortcuts pane ([af0963f](https://github.com/kevenleone/lore/commit/af0963f50695c1041667e26175bc6787ac80a431))
- add, edit, and remove collections ([4f9b4e6](https://github.com/kevenleone/lore/commit/4f9b4e6a925b26076071c077fc12580f2a455574))
- collapse the sidebar with a width transition instead of unmounting it ([792d96a](https://github.com/kevenleone/lore/commit/792d96ab4d68f1725e0debfa772daa8364c1ba6c))
- cut over to the Markdown vault and import the legacy library ([332cffc](https://github.com/kevenleone/lore/commit/332cffc8c4142a3d147185360060fd5005823621))
- expand the drawer to a full page for one item ([a40d5d5](https://github.com/kevenleone/lore/commit/a40d5d5b893a33dc68cc59b6f4c6f036b1e9d5d3))
- leave the Dock and app switcher while Lore sits in the tray ([7d3ec61](https://github.com/kevenleone/lore/commit/7d3ec611c428c893b3ad72fef9f53d8a34834bee))
- leave the Dock and app switcher while Lore sits in the tray ([52b697d](https://github.com/kevenleone/lore/commit/52b697db1022228b21bd155869417884c17371b2))
- migration notice, vault seeding, file rename, and per-vault tag order ([0a27490](https://github.com/kevenleone/lore/commit/0a27490feba6513b19aeb92a67ab5ba8353456b5))
- offline-first knowledge base with quick capture ([8aa563a](https://github.com/kevenleone/lore/commit/8aa563a703895184fc616d06a9ad9ef680eceeb0))
- open an item from Cards or Table in a drawer or a page ([ae7ae3e](https://github.com/kevenleone/lore/commit/ae7ae3e1a05a020a69a518787f3042db2e6a8d7c))
- open any folder as a vault ([f885177](https://github.com/kevenleone/lore/commit/f8851773284cdde47940cdd61f7ff1bdf712e56e))
- open the focus popover from the tray and mark a running session on the icon ([e315ccd](https://github.com/kevenleone/lore/commit/e315ccddbff3eec57476fb997c3d5a98ccee626d))
- paint a hashed placeholder under an item's preview image ([b4271b3](https://github.com/kevenleone/lore/commit/b4271b33afad58a5bf9bffcc2a0fcee7a7bf8825))
- pick the library layout from Look & Feel ([45a3041](https://github.com/kevenleone/lore/commit/45a30414499991b078ecc461c5a6f7779157c3b6))
- reach the focus surfaces and the calendar from the window chrome ([13e75fb](https://github.com/kevenleone/lore/commit/13e75fb617b7d75664435a8c05d47aa0dcebd601))
- read and write a Markdown vault with an FTS index ([701ceca](https://github.com/kevenleone/lore/commit/701ceca5d6977f93341839c8dc4cec51be77da33))
- rebrand to Lore with onboarding, settings modal, and theming ([3695b07](https://github.com/kevenleone/lore/commit/3695b07ba07b393c4b21549fb6aae93fcc4e3638))
- render the library as List, Cards or Table ([2caade6](https://github.com/kevenleone/lore/commit/2caade6f68b906bf0ca6c15f9a0e0ae193cf1904))
- search note bodies through the FTS index ([e9d782b](https://github.com/kevenleone/lore/commit/e9d782bb7e8ebf7dfb7bd22780cdd8e9602a6765))
- search, sort, flag, tags, edit, delete, and link metadata ([4d9ed62](https://github.com/kevenleone/lore/commit/4d9ed628d898db48b97c855317612fda8a85a327))
- show the focus countdown in the menu-bar tray ([589e272](https://github.com/kevenleone/lore/commit/589e272d5a3447785866bb20b840670ee2ef4057))
- slide the detail drawer in and out instead of popping it ([047cb8a](https://github.com/kevenleone/lore/commit/047cb8a1257e26c7ae2e0bba7486b81682701c84))
- spawn and supervise the data engine from Tauri ([7cdd5af](https://github.com/kevenleone/lore/commit/7cdd5af2c22ac87f0f6cf74d9ad4d758509a7b54))
- stop a focus session outright, which is what clears the menu bar ([1a249ef](https://github.com/kevenleone/lore/commit/1a249efaef770070d5e0c07bd9a02d120639271f))
- tick a queue item off in place instead of dropping it ([ae00a07](https://github.com/kevenleone/lore/commit/ae00a07b1ac0acaf009bb730a28130c440d2ec1a))
- tray left-click opens the menu, main window hides on close ([37de391](https://github.com/kevenleone/lore/commit/37de3917945c9e563cb2c66c065aa8a3eb9036eb))

### Bug Fixes

- capture and detail corrections for reset, tags, edit, and delete ([65e3525](https://github.com/kevenleone/lore/commit/65e3525d1630b15dc8c4dab9bdcf6fd24b5b631b))
- capture save and floating capture window, add system tray ([18e748f](https://github.com/kevenleone/lore/commit/18e748f5aed70180e59cddf94cbfcd03810cdb8d))
- clear the menu-bar countdown when a session stops ([0be0c76](https://github.com/kevenleone/lore/commit/0be0c76a4cbebff8723e8a43a64328dabbb915c3))
- clear the tray when a session stops, and keep it in step with the window ([b69d461](https://github.com/kevenleone/lore/commit/b69d4618ae3627650ba23cb8b4b81157434d28cd))
- escape the control-character range in the filename regex ([afcaa0f](https://github.com/kevenleone/lore/commit/afcaa0fd6616f612b9a3a98d99edfe4ab9ecff5b))
- grant sql:allow-execute so writes and schema work ([0e72473](https://github.com/kevenleone/lore/commit/0e7247336522e7be4e70a2a34c106065feb24a56))
- keep a ticked-off queue item ticked off across a reload ([5b831a9](https://github.com/kevenleone/lore/commit/5b831a9b990002478e8ab8a83edba49bdc94c78e))
- keep overlays outside the zoomed subtree so Text size can be dragged ([ac4d354](https://github.com/kevenleone/lore/commit/ac4d3546ebc1032852ccdea168bd35bf32845876))
- paint the title bar from a theme token instead of a fixed near-white ([ff6223c](https://github.com/kevenleone/lore/commit/ff6223cc6d0c7ac874b02d74dd00d4a13a6483a4))
- paint the tray from one task so it cannot deadlock or show a stale time ([64bd4a5](https://github.com/kevenleone/lore/commit/64bd4a58a6c89e46db0c905f001b90de6671fddf))
- read a session paused in its first second as a live one ([9909ab4](https://github.com/kevenleone/lore/commit/9909ab4e4c286c4e752ada7aeb57201017ce7380))
- replace the Quick Capture collection picker with a custom dropdown ([a238bdc](https://github.com/kevenleone/lore/commit/a238bdca4fdaf2448cfbbababd24e92ba12d16f3))
- resolve badge, shadow, and scrollbar colours through the theme tokens ([b95f604](https://github.com/kevenleone/lore/commit/b95f6046ad3bba0a7463716c86d686795bbef0ec))
- show the tray countdown only while a session runs ([594853b](https://github.com/kevenleone/lore/commit/594853baaa2b6bd876d10e2be4dba9ff0aecb9be))
- stop the focus popover scrolling its own contents ([20e54f5](https://github.com/kevenleone/lore/commit/20e54f5db6257b19ef85820d3fe09a0d46df9408))

### Refactoring

- move link metadata into the engine and drop plugin-http ([9fb18e3](https://github.com/kevenleone/lore/commit/9fb18e3ccfc1cdf8581a43030c028dfe86c87a71))
- split url and body out of snippet, decouple the repository seam ([576da20](https://github.com/kevenleone/lore/commit/576da2028197acdc9abf33539e705aa173bcfe3a))

### Documentation

- rewrite the README for the Markdown vault ([7885aa8](https://github.com/kevenleone/lore/commit/7885aa89ade54d5a50e04febe184216c6ecacf97))

### Build System

- add eslint, prettier, and editorconfig ([f7d849a](https://github.com/kevenleone/lore/commit/f7d849a6087fd65fb526eadab0273afd733fcb49))
