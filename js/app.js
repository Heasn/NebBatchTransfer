var Nebulas = require("nebulas");
var HttpRequest = Nebulas.HttpRequest;
var Account = Nebulas.Account;
var neb = new Nebulas.Neb();
neb.setRequest(new HttpRequest("https://mainnet.nebulas.io"));

var NebPay = require("nebpay");
var pay = new NebPay();


var app = new Vue({
    el: "#app",
    data: {
        title: "批量转账",
        transferAddress: "转账地址",
        transferAmount: "转账金额（NAS）",
        transfer: "转账",
        transferModalTitle: "添加转账",
        transferOrder: "转账订单",
        createTransaction: "添加记录",
        cancelTransaction: "取消",
        clear: "清除记录",
        transactions: [],
        address: "",
        amount: "",
        total: new BigNumber(0),
        transactionFailReason: "",
        transactionResults: [],
    },
    methods: {
        addTransaction: function () {
            var transactionAmount = new BigNumber(this.amount);

            if (!Account.isValidAddress(this.address)) {
                $("#addressInput").addClass("invalid");
                return;
            }

            if (transactionAmount.isNaN()) {
                $("#amountInput").addClass("invalid");
                return;
            }

            this.transactions.push({
                address: this.address,
                amount: transactionAmount
            });

            this.total = this.total.plus(transactionAmount);

            this.address = "";
            this.amount = "";

            $("#transferModal").modal("hide");

            $("#addressInput").removeClass("valid");
            $("#addressInput").removeClass("invalid");
            $("#amountInput").removeClass("valid");
            $("#amountInput").removeClass("invalid");
        },
        deleteTransaction: function (index) {
            var transaction = this.transactions[index];

            this.total = this.total.minus(transaction.amount);

            this.transactions.splice(index, 1);
        },
        clearTransactions: function () {
            if (this.transactions.length > 0) {
                this.transactions.splice(0, this.transactions.length);
                this.total = new BigNumber(0);
            } else {
                $("#clearInvalidModal").modal('show');
            }
        },
        checkTransfer: function () {
            if (this.transactions.length < 1) {
                $("#tranferInvalidModal").modal("show");
            } else {
                $("#orderModal").modal("show");
            }
        },
        doTransfer: function () {
            var to = "n1jGFUQpqgSUnz9dzkzVJh1HyA6raDZ5hGx";
            var value = app._data.total.toNumber();
            var callFunction = "transfer";
            var callArgs = JSON.stringify([JSON.stringify(this.transactions)]);

            pay.call(to, value, callFunction, callArgs, {
                goods: {
                    name: "批量转账订单",
                    desc: "BatchTransfer批量转账订单"
                },

                callback: NebPay.config.mainnetUrl,
                listener: browserListener
            });
        }
    }
});

$(function () {
    if (typeof (webExtensionWallet) == "undefined") {
        $("#walletExtensionModal").modal('show');
    }
});

function validateAddress(inputTarget) {
    var target = $(inputTarget);
    var address = target.val();
    if (Account.isValidAddress(address)) {
        target.removeClass("invalid")
        target.addClass("valid");
    } else {
        target.removeClass("valid");
        target.addClass("invalid");
    }
}

function validateAmount(inputTarget) {
    var target = $(inputTarget);
    var amount = target.val();
    var bn = new BigNumber(amount);

    if (bn.isNaN()) {
        target.removeClass("valid")
        target.addClass("invalid");
    } else {
        target.removeClass("invalid");
        target.addClass("valid");
    }
}

function browserListener(resp) {
    var respString = JSON.stringify(resp);

    if (respString.search("rejected by user") !== -1) {
        //交易取消
        $("#payModal").modal('hide');
    } else if (respString.search("txhash") !== -1) {
        //支付成功，可以等待获取支付结果
        $("#payModal").modal('hide');
        $("#transactionModal").modal('show');

        var intervalHandler = setInterval(() => {
            neb.api.getTransactionReceipt({
                    hash: resp.txhash
                })
                .then(function (response) {
                    if (response.status === 2) {
                        //等待交易结果
                    } else {
                        setTransactionResultModal(response);
                        clearInterval(intervalHandler);
                    }
                })
                .catch(function (err) {
                    console.log(err);
                });
        }, 15000);
    }
}

function setTransactionResultModal(resp) {
    if (resp.status === 0) {
        //交易失败
        $("#transactionModal").modal('hide');

        app._data.transactionFailReason = resp.execute_error;

        $("#failModal").modal('show');
    } else if (resp.status === 1) {
        //交易成功
        $("#transactionModal").modal('hide');

        app._data.transactionResults = JSON.parse(resp.execute_result);

        $("#successModal").modal('show');
    }
}
