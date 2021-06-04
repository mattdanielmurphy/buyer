import { Browser, Page, chromium } from 'playwright'

import fs from 'fs/promises'

const prompts = require('prompts')

require('dotenv').config()
const { env } = process
console.log('Starting...')

fs.rmdir('screenshots', { recursive: true }).then(() => fs.mkdir('screenshots'))

const delay = async (miliseconds: number) =>
	new Promise((res) => setTimeout(res, miliseconds))

async function fillForm(
	page: Page,
	formData: {
		[name: string]: string
	},
	propertyName: string,
) {
	const formDataArray = Object.entries(formData)
	for (let i = 0; i < formDataArray.length; i++) {
		const [name, value] = formDataArray[i]
		const selector = `input[${propertyName}^=${name}]`
		await page.fill(selector, value)
	}
	return formDataArray
}

async function racePromises(promises: Promise<any>[]): Promise<number> {
	const wrappedPromises: Promise<any>[] = []
	promises.map((promise, index) => {
		wrappedPromises.push(
			new Promise<number>((resolve) => {
				promise.then(() => {
					resolve(index)
				})
			}),
		)
	})
	return Promise.race(wrappedPromises)
}

let screenshotIndex = 0

async function screenshot(page: Page, name: string) {
	screenshotIndex++
	return await page.screenshot({
		path: `screenshots/${screenshotIndex}-${name}.png`,
	})
}

async function doIt() {
	const browser = await chromium.launch()
	const context = await browser.newContext()
	const cookiesRaw = await fs.readFile('cookies.json', 'utf8')
	const cookies = JSON.parse(cookiesRaw)
	if (!env.NE_PASS) throw 'No NE_PASS field in .env'
	context.addCookies(cookies)
	const page = await context.newPage()

	// go to product page
	await page.goto(
		'https://www.newegg.ca/samsung-1tb-980-pro/p/N82E16820147790?Item=N82E16820147790&cm_sp=Homepage_dailydeals-_-P0_20-147-790-_-06032021',
	)
	let time = ''
	console.time('time')
	console.log('page loaded')
	// verify seller
	// if (!seller.includes('Sold by: Newegg')) return

	await page.click('text=Add to Cart')
	console.log('added to cart')
	await screenshot(page, 'added-to-cart')

	const noThanksButtonSelector = 'text=No, thanks'
	const checkoutButtonSelector = 'text=View Cart & Checkout'

	const navigationOutcome = await racePromises([
		page.waitForSelector(noThanksButtonSelector),
		page.waitForSelector(checkoutButtonSelector),
	])
	console.log('outcome reahed', navigationOutcome)
	if (navigationOutcome === 0) {
		await page.click(noThanksButtonSelector)
		await page.waitForSelector(checkoutButtonSelector)
	}
	await page.click(checkoutButtonSelector)
	await screenshot(page, 'checkout button clicked')
	console.log('checkout button clicked')

	// await page.waitForNavigation()
	await page.waitForSelector('text=Secure Checkout')
	await page.click('text=Secure Checkout')
	await page.waitForNavigation()

	await screenshot(page, 'sign in')
	await page.waitForSelector('#labeled-input-signEmail')
	await page.keyboard.type('matt@mattmurphy.ca')
	await delay(50)
	await page.mouse.click(900, 255, { delay: 50 })
	await delay(50)
	await page.mouse.click(900, 255, { delay: 50 })
	await delay(50)
	await page.mouse.click(900, 255, { delay: 50 })
	await delay(50)
	await page.mouse.click(900, 255, { delay: 50 })
	await delay(500)
	await screenshot(page, 'sign-in filled')

	const first = await racePromises([
		page.waitForSelector('text=Security Code').catch(() => {}),
		page.waitForSelector('#labeled-input-password').catch(() => {}),
	])

	if (first === 0) {
		await page.mouse.click(770, 300)
		const response = await prompts({
			type: 'number',
			name: 'securityCode',
			message: 'Enter security code emailed to matt@mattmurphy.ca',
		})
		const securityCode = String(response.securityCode)
		await page.keyboard.type(securityCode)
		await screenshot(page, 'sec code filled')
		await delay(50)
		await page.keyboard.press('Enter')
		await delay(200)
		await screenshot(page, 'sec code submitted')
		// sign in again
		await page.mouse.click(900, 255, { delay: 50 })
		await delay(500)
		await page.keyboard.type(env.NE_PASS || '')
		await page.keyboard.press('Enter')
		const cookies = await context.cookies()
		const cookieJson = JSON.stringify(cookies)
		console.log(cookieJson)
		fs.writeFile('cookies.json', cookieJson)
	} else {
		console.log('doesnt need sec code')
		await page.keyboard.type(env.NE_PASS || '')
		await page.keyboard.press('Enter')
	}
	await delay(500)
	await screenshot(page, 'signed in')

	// await page.waitForSelector('text=Continue With Guest Checkout')
	// await page.click('text=Continue With Guest Checkout')

	// await page.waitForSelector('i[aria-label$=local]')
	// await page.click('i[aria-label$=local]')

	// await page.waitForSelector('.card-add-new')
	// await page.click('.card-add-new')
	// const address = {
	// 	FirstName: 'Matthew',
	// 	LastName: 'Murphy',
	// 	Address1: '221 Westbrook Wynd',
	// 	City: 'Fort Saskatchewan',
	// 	ZipCode: 'T8L0L6',
	// 	Phone: '5878798124',
	// 	Email: 'matthewdanielmurphy@outlook.com',
	// }
	// // might have to select Alberta from Province dropdown list
	// await delay(200)
	// await page.waitForSelector('input[name=FirstName]')

	// await fillForm(page, address, 'name')
	// console.log('add new address loaded')
	// // await delay(100)
	// await page.waitForSelector('.btn-primary[data-target$=Verification]')
	// await page.click('.btn-primary[data-target$=Verification]')
	// console.log('submitted address')
	// await screenshot(page, 'address')
	// // await delay(100)

	// await page.waitForSelector('text=Continue to delivery')
	// await page.click('text=Continue to delivery')
	// await screenshot(page, 'continue-to-delivery')
	// console.log('continue to delivery')

	// // await delay(100)
	// await page.waitForSelector('text=Continue to payment')
	// await page.click('text=Continue to payment')
	// await screenshot(page, 'continue-to-payment')
	// console.log('continue to payment')

	// // await delay(100)
	// await page.waitForSelector('text=Add New Credit Card')
	// await page.click('text=Add New Credit Card')
	// console.log('add new card')

	// await delay(800)
	// await page.mouse.click(370, 125)
	// console.log('clicked')
	// await screenshot(page, 'clicked')
	// await page.keyboard.insertText('Matthew Murphy')
	// await page.keyboard.press('Tab')
	// if (!env.MC || !env.CVV2) throw 'No CC number found, check .env'
	// await page.keyboard.insertText(env.MC)
	// await page.keyboard.press('Tab')
	// await page.keyboard.type('02')

	// await page.keyboard.press('Tab')
	// await page.keyboard.type('2024')

	// await page.keyboard.press('Tab')
	// await page.keyboard.type('221 Westbrook Wynd')
	// await page.keyboard.press('Tab')
	// await page.keyboard.press('Tab')
	// await page.keyboard.type('Fort Saskatchewan')
	// await page.keyboard.press('Tab')
	// await page.keyboard.type('Alberta')
	// await page.keyboard.press('Tab')
	// await page.keyboard.type('T8L0L6')
	// await page.keyboard.press('Tab')
	// await page.keyboard.type('5878798124')
	// await page.keyboard.press('Enter')
	// await page.mouse.click(900, 675)
	// console.log('clicked')

	// await page.waitForSelector('input[placeholder=CVV2]')
	// await page.fill('input[placeholder=CVV2]', env.CVV2)
	// await page.click('text=Review your order')
	// await screenshot(page, 'add-new-credit-card')
	// await page.waitForSelector('text=Place Order')
	// await screenshot(page, 'review-order')
	// ! BE CAREFUL! NEXT LINE WILL PLACE ORDER
	// ! BE CAREFUL! NEXT LINE WILL PLACE ORDER
	// ! BE CAREFUL! NEXT LINE WILL PLACE ORDER
	// // await page.click('text=Place Order')
	// ! BE CAREFUL! ABOVE LINE WILL PLACE ORDER
	// ! BE CAREFUL! ABOVE LINE WILL PLACE ORDER
	// ! BE CAREFUL! ABOVE LINE WILL PLACE ORDER
	console.log('Done!')
	console.timeEnd('time')

	await browser.close()
}

doIt()
