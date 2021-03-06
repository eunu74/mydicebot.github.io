'use strict';

import {BaseDice} from './base'
import FormData from 'form-data';
import {APIError} from '../errors/APIError'

export class CryptoDice extends BaseDice {
    constructor(){
        super();
        this.url = 'https://api.crypto-games.net';
    }

    async login(userName, password, twoFactor ,apiKey, req) {
        let ret = await this._send('user/btc', 'GET', '', apiKey);
        req.session.accessToken = apiKey;
        req.session.username = apiKey;
        return true;
    }

    async getUserInfo(req) {
        return true;
    }

    async refresh(req) {
        console.log('refresh');
        let info = req.session.info;
        if(!info){
            return false;
        }
        let ret = await this._send('user/'+req.query.currency, 'GET', '', req.session.accessToken);
        console.log(ret);
        let userinfo = info.info;
        userinfo.bets = ret.TotalBets;
        userinfo.profit = ret.Profit;
        userinfo.wagered = ret.Wagered;
        userinfo.balance = ret.Balance;
        userinfo.success = 'true';
        info.info = userinfo;
        req.session.info = info;
        return info;
    }

    async clear(req) {
        console.log('clear');
        let ret = await this._send('user/'+req.query.currency, 'GET', '', req.session.accessToken);
        console.log(ret);
        let info = {};
        let userinfo = {
            'bets' : 0,
            'wins' : 0,
            'losses' : 0,
            'profit' : 0,
            'wagered' : 0,
            'balance' : 0,
        };
        info.currentInfo = {
            'bets' : 0,
            'wins' : 0,
            'losses' : 0,
            'profit' : 0,
            'wagered' : 0,
            'balance' : 0,
        };
        info.currentInfo.balance = ret.Balance;
        userinfo.bets = ret.TotalBets;
        userinfo.profit = ret.Profit;
        userinfo.wagered = ret.Wagered;
        userinfo.balance = ret.Balance;
        userinfo.success = 'true';
        info.info = userinfo;
        req.session.info = info;
        return info;
    }

    async bet(req) {
        let amount = parseFloat(req.body.PayIn/100000000);
        //let amount = 0.00000001;
        let condition = req.body.High == 1?true:false;
        let currency = req.body.Currency.toLowerCase();
        let target = 0;
        if(req.body.High == 1){
            target = 999999-Math.floor((req.body.Chance*10000))+1;
        } else {
            target = Math.floor((req.body.Chance*10000))-1;
        }
        target = target/10000;
        let underOver = condition + ' ' + target;
        let payout = parseFloat(parseFloat((100 - 0.8) / target).toFixed(4));
        let data = {};
        data.Payout = payout;
        data.UnderOver = condition;
        data.Bet = amount;
        data.ClientSeed = Math.sin(1).toString().substr(6);
        let ret = await this._send('placebet/'+currency, 'POST', data, req.session.accessToken);
        console.log(ret);
        let info = req.session.info;
        let betInfo = {};
        betInfo.condition = req.body.High == 1?'>':'<';
        betInfo.id = ret.BetId;
        betInfo.target = target;
        betInfo.profit = ret.Profit;
        betInfo.roll = ret.Roll;
        betInfo.payout = payout;
        betInfo.amount = amount;
        info.info.balance = (parseFloat(info.info.balance) + parseFloat(ret.Profit)).toFixed(8);
        info.currentInfo.balance = (parseFloat(info.currentInfo.balance) + parseFloat(ret.Profit)).toFixed(8);
        info.info.bets++;
        info.currentInfo.bets++;
        info.info.profit = (parseFloat(info.info.profit) + parseFloat(ret.Profit)).toFixed(8);
        info.info.wagered = (parseFloat(info.info.wagered) + parseFloat(amount)).toFixed(8);
        info.currentInfo.wagered = (parseFloat(info.currentInfo.wagered) + parseFloat(amount)).toFixed(8);
        info.currentInfo.profit = (parseFloat(info.currentInfo.profit) + parseFloat(ret.Profit)).toFixed(8);
        if(ret.Profit>0){
            betInfo.win = true;
            info.info.wins++;
            info.currentInfo.wins++;
        } else {
            betInfo.win = false;
            info.info.losses++;
            info.currentInfo.losses++;
        }
        let returnInfo = {};
        returnInfo.betInfo= betInfo;
        returnInfo.info = info;
        req.session.info = info;
        return returnInfo;
    }

    async _send(route, method, body, accessToken){
        let url = `${this.url}/v1/${route}/${accessToken}`;
        console.log(JSON.stringify(body));
        let res = await fetch(url, {
            method,
            headers: {
                Accept: 'application/json, text/plain, */*',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            //body: body,
        });
        let data = await res.json();
        console.log(data);
        if (!res.ok) {
            let errs = new Error(data.Message);
            errs.value = data.Message;
            throw new APIError(data.Message ,errs);
        }
        return data;
    }
}
