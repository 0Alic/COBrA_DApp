DeployEditor = {

    /**
     * Deploy a new content on the blockchain
     */
    deployContent: function() {

        const title = $('#publishTitleInput').val();
        const author = $('#publishAuthorInput').val();
        const genre = $('#genreSelect').val();
        const price = $('#priceInput').val();
        const unit = $('#priceUnitSelect').val();
        const priceInWei = parseInt(price) * parseInt(unit);

        Res.contracts.Catalog.deployed().then( async(instance) => {

            alert("You are deploying a contract with this information:\n" + 
                    "- Author: " + author +
                    "\n- Title: " + title + 
                    "\n- Genre: " + genre +
                    "\n- Cost : " + web3.fromWei(priceInWei, 'ether') + " ether" +
                    "\n Confirm or reject the transation on metamask.");

            const content = await Res.contracts[genre].new(web3.fromUtf8(author), web3.fromUtf8(title), priceInWei, instance.address);

            alert("Contratulations! Your content was succesfully deployed on the blockchain!\n"+
                    "The address is: " + content.address + ".\nUse this address to link your content to the Catalog.");

            $('#contentAddr').html("Insert this address in the Catalog: " + content.address);

        }).catch(function(error) {
            console.log(error);
            const errorS = "Error while processing, possible reasons:\n"+
                            " - Not enough balance;\n"+
                            " - Increase gas limit.";
            alert(errorS);
        });
    }
}