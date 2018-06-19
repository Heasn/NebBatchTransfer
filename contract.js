"use strict";

var BatchTransferContract = function () {

};

BatchTransferContract.prototype = {
    init: function () {

    },

    transfer: function (transactionsJson) {

        var transactions = JSON.parse(transactionsJson);
        var totalAmount = Blockchain.transaction.value;

        var transactionsAmount = new BigNumber(0);

        //计算转账的金额和打入的金额是否相同
        for (var index in transactions) {
            transactionsAmount = transactionsAmount.plus(new BigNumber(transactions[index].amount).times("1e18"));
        }

        if (!totalAmount.eq(transactionsAmount)) {
            throw new Error("转账订单内的总金额与实际转入的金额不相等，无法转账");
        }

        var results = [];
        for (var index in transactions) {
            var transferAmount = new BigNumber(transactions[index].amount).times("1e18");
            var transferResult = Blockchain.transfer(transactions[index].address, transferAmount);

            if (transferResult) {
                totalAmount = totalAmount.minus(transferAmount);
            }

            results.push({
                address: transactions[index].address,
                amount: transactions[index].amount,
                result: transferResult
            });

            //记录此次发放事件
            Event.Trigger("BatchTransfer转账", {
                Transfer: {
                    from: Blockchain.transaction.from,
                    to: transactions[index].address,
                    value: transferAmount.toString(),
                    success: transferResult
                }
            });
        }

        //如果有转账失败，账户有剩余，则原路退回
        if (totalAmount.gt(0)) {
            Blockchain.transfer(Blockchain.transaction.from, totalAmount);
        }

        return results;
    }
};

module.exports = BatchTransferContract;
