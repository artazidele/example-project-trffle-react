import React, { useEffect, useState, useCallback } from "react";
import CharityPlatformContract from "../../contracts/CharityPlatform.json";
const { ethers } = require("ethers");

export function Project() {
    const [account, setAccount] = useState("");
    const [accountAmount, setAccountAmount] = useState(0);
    const [amount, setAmount] = useState("");
    const [amountError, setAmountError] = useState(false);
    const [project, setProject] = useState(null);
    const [milestones, setMilestones] = useState([]);
    const [loading, setLoading] = useState(false);

    const id = window.location.href.split("/")[3];

    useEffect(() => {
        requestAccount();
        fetchProjectData();
    }, [account]);

    const requestAccount = useCallback(async () => {
        if (window.ethereum == null) {
            console.log("MetaMask not installed; using read-only defaults");
            return;
        }
        try {
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            setAccount(ethers.utils.getAddress(accounts[0]));
        } catch (error) {
            console.error("Failed to fetch account:", error);
        }
    }, []);

    const initializeContract = useCallback(() => {
        const contractAddress = localStorage.getItem("contract");
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        return new ethers.Contract(contractAddress, CharityPlatformContract.abi, signer);
    }, []);

    const fetchProjectData = useCallback(async () => {
        setLoading(true);
        try {
            const thisContract = initializeContract();
            const projectData = await thisContract.getProject(id);

            const milestoneCount = projectData.milestoneCount.toNumber();
            const milestonesData = [];
            for (let i = 0; i < milestoneCount; i++) {
                const milestone = await thisContract.getMilestone(id, i);
                milestonesData.push(milestone);
            }

            setProject(projectData);
            setMilestones(milestonesData);

            // Fetch donations for the current user
            const donations = await thisContract.getProjectDonations(id, account);
            setAccountAmount(parseInt(donations));
        } catch (error) {
            console.error("Error fetching project data:", error);
        } finally {
            setLoading(false);
        }
    }, [account, id, initializeContract]);

    const deactivateProject = useCallback(async () => {
        try {
            const thisContract = initializeContract();
            const tx = await thisContract.deactivateProject(id);
            await tx.wait();
            fetchProjectData();
        } catch (error) {
            console.error("Error deactivating project:", error);
        }
    }, [id, initializeContract, fetchProjectData]);

    const donate = useCallback(
        async (e) => {
            e.preventDefault();
            setAmountError(false);

            if (isNaN(amount) || +amount <= 0) {
                setAmountError(true);
                return;
            }

            try {
                const thisContract = initializeContract();
                const tokenAmount = ethers.utils.parseUnits(amount.toString(), 18);
                const tx = await thisContract.donate(account, { value: tokenAmount });
                await tx.wait();
                setAmount("");
                fetchProjectData();
            } catch (error) {
                console.error("Error during donation:", error);
            }
        },
        [amount, account, initializeContract, fetchProjectData]
    );

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            {project && (
                <div>
                    <h3 className="ml-6 my-8 text-4xl italic text-coffee_5 font-semibold">{project.name || "Untitled Project"}</h3>
                    <div className="bg-white p-6 rounded-lg border-solid border-2 border-coffee_2">
                        <div
                            className={`w-full italic text-xl text-right px-12 my-4 ${
                                project.isActive ? "text-lime-900" : "text-red-900"
                            }`}
                        >
                            <p>{project.isActive ? "Active" : "Not active"}</p>
                        </div>
                        <h2 className="font-semibold text-xl my-6">
                            Goal amount: {project.goalAmount ? project.goalAmount.toString() : "N/A"} EUR
                        </h2>
                        <h2 className="font-semibold text-xl my-6">
                            Raised amount: {project.raisedAmount ? project.raisedAmount.toString() : "N/A"} EUR
                        </h2>
                        <h2 className="font-semibold text-xl my-6 pt-6 border-t-2 border-t-coffee_2">Milestones:</h2>

                        {milestones && milestones.length > 0 ? (
                            milestones.map((milestone, index) => (
                                <div className="my-8 pb-6 border-b border-b-coffee_2" key={index}>
                                    <h2 className="font-medium text-lg my-4">
                                        Target amount: {milestone.amount ? milestone.amount.toString() : "N/A"} EUR
                                    </h2>
                                    <h2 className="font-medium text-lg my-4">Description:</h2>
                                    <p>{milestone.description || "No description provided."}</p>
                                </div>
                            ))
                        ) : (
                            <p>No milestones added yet.</p>
                        )}

                        {account && (
                            <div>
                                {account === project.charityAddress && project.isActive && (
                                    <button
                                        onClick={deactivateProject}
                                        className="bg-white text-center mt-12 hover:text-white hover:bg-red-900 hover:border-red-900 font-semibold text-red-900 py-2 px-4 border-2 border-red-900 rounded-lg"
                                    >
                                        Deactivate project
                                    </button>
                                )}

                                {account !== project.charityAddress && project.isActive && (
                                    <div>
                                        <p>Currently, you have donated {accountAmount || 0} EUR.</p>
                                        <form>
                                            <div className="mt-6 flex items-center justify-between gap-2">
                                                <label className="font-semibold">Amount (EUR): </label>
                                                <input
                                                    value={amount}
                                                    onChange={(e) => setAmount(e.target.value)}
                                                    className="p-2 bg-transparent border-b-solid border-b border-b-coffee_5 grow"
                                                />
                                            </div>
                                            {amountError && (
                                                <p className="w-full text-red-900 italic text-sm my-4">
                                                    Amount must be a positive number.
                                                </p>
                                            )}
                                            <button
                                                onClick={donate}
                                                className="bg-white text-center mt-12 hover:text-white hover:bg-lime-900 hover:border-lime-900 font-semibold text-lime-900 py-2 px-4 border-2 border-lime-900 rounded-lg"
                                            >
                                                Donate
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
