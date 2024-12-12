import React, { useState, useMemo } from 'react';
import CharityPlatformContract from '../../contracts/CharityPlatform.json';
const { ethers } = require("ethers");

export function NewProject() {
    const [milestones, setMilestones] = useState([]);
    const [goalAmount, setGoalAmount] = useState("");
    const [goalAmountError, setGoalAmountError] = useState(false);
    const [title, setTitle] = useState("");
    const [amount, setAmount] = useState("");
    const [amountError, setAmountError] = useState(false);
    const [description, setDescription] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const totalMilestoneSum = useMemo(() => 
        milestones.reduce((sum, milestone) => sum + parseInt(milestone.amount || 0), 0),
        [milestones]
    );

    const isAddDisabled = useMemo(() => {
        const goal = parseInt(goalAmount) || 0;
        return totalMilestoneSum >= goal || !amount || isNaN(+amount) || +amount <= 0 || !description.trim();
    }, [goalAmount, totalMilestoneSum, amount, description]);

    const isCreateDisabled = useMemo(() => {
        return (
            !title.trim() ||
            isNaN(+goalAmount) ||
            +goalAmount <= 0 ||
            milestones.length === 0
        );
    }, [title, goalAmount, milestones]);

    const saveMilestone = (e) => {
        e.preventDefault();
        setAmountError(false);

        const newMilestoneAmount = parseInt(amount);
        if (isNaN(newMilestoneAmount) || newMilestoneAmount <= 0) {
            setAmountError(true);
        } else if (!description.trim()) {
            alert("Milestone description cannot be empty.");
        } else if (totalMilestoneSum + newMilestoneAmount > parseInt(goalAmount)) {
            alert("The sum of milestone amounts cannot exceed the total goal amount.");
        } else {
            const newMilestone = {
                index: milestones.length ? milestones[milestones.length - 1].index + 1 : 0,
                amount: newMilestoneAmount,
                description,
            };

            setMilestones([...milestones, newMilestone]);
            setAmount("");
            setDescription("");
        }
    };

    const removeMilestone = (e) => {
        e.preventDefault();
        const updatedMilestones = milestones.filter(item => item.index !== parseInt(e.target.value));
        setMilestones(updatedMilestones);
    };

    async function createProject(e) {
        e.preventDefault();
        setGoalAmountError(false);

        if (isNaN(+goalAmount) || +goalAmount <= 0) {
            setGoalAmountError(true);
        } else if (!title.trim()) {
            alert("Project title cannot be empty.");
        } else if (totalMilestoneSum > parseInt(goalAmount)) {
            alert("The sum of milestone amounts cannot exceed the total goal amount.");
        } else {
            try {
                const contractAddress = localStorage.getItem('contract');
                const signerAddress = localStorage.getItem('signer');
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner(signerAddress);
                const thisContract = new ethers.Contract(contractAddress, CharityPlatformContract.abi, signer);

                const milestoneAmounts = milestones.map(milestone => parseInt(milestone.amount));
                const milestoneDescriptions = milestones.map(milestone => milestone.description);

                const project = await thisContract.createProject(
                    title,
                    parseInt(goalAmount),
                    milestoneDescriptions,
                    milestoneAmounts
                );

                await project.wait();

                thisContract.on('ProjectCreated', () => {
                    setSuccessMessage(`Your new project "${title}" has been created successfully!`);
                    setAmount("");
                    setDescription("");
                    setTitle("");
                    setGoalAmount("");
                    setMilestones([]);
                });
            } catch (error) {
                console.error("Error:", error);
            }
        }
    }

    return (
        <div className="container mx-auto px-4">
            <h3 className="my-8 text-4xl italic text-coffee_5 font-semibold">New Project</h3>
            {successMessage && (
                <p className="text-green-700 font-semibold text-lg mb-4">
                    {successMessage}
                </p>
            )}
            <form>
                <div className="bg-white p-6 rounded-lg shadow-lg border-solid border-2 border-coffee_2">
                    <div className="mt-6 flex items-center justify-between gap-2">
                        <label className="font-semibold">Title:</label>
                        <input
                            onChange={e => setTitle(e.target.value)}
                            value={title}
                            aria-label="Project Title"
                            className="p-2 bg-transparent border-b-solid border-b border-b-coffee_5 grow"
                        />
                    </div>
                    <div className="mt-6 flex items-center justify-between gap-2">
                        <label className="font-semibold">Goal amount (EUR):</label>
                        <input
                            onChange={(e) => {
                                const value = e.target.value;
                                setGoalAmount(value);
                                setGoalAmountError(isNaN(value) || +value <= 0);
                            }}
                            value={goalAmount}
                            aria-label="Goal amount in EUR"
                            className={`p-2 bg-transparent border-b-solid border-b grow ${
                                goalAmountError ? "border-red-500" : "border-coffee_5"
                            }`}
                        />
                    </div>
                    {goalAmountError && (
                        <p className="w-full text-red-900 italic text-sm my-4">
                            Goal amount must be a number greater than 0.
                        </p>
                    )}
                    <div className="mt-6">
                        <h6 className="font-semibold border-t-solid border-t-2 pt-6 border-t-coffee_2">
                            New Milestone:
                        </h6>
                        <div className="mt-6 flex items-center justify-between gap-2">
                            <label className="font-semibold">Amount (EUR):</label>
                            <input
                                onChange={e => setAmount(e.target.value)}
                                value={amount}
                                aria-label="Milestone Amount"
                                className="p-2 bg-transparent border-b-solid border-b border-b-coffee_5 grow"
                            />
                        </div>
                        {amountError && (
                            <p className="w-full text-red-900 italic text-sm my-4">
                                Amount must be a number greater than 0.
                            </p>
                        )}
                        <div className="mt-6 flex-row items-center justify-between">
                            <label className="font-semibold">Description:</label>
                            <textarea
                                onChange={e => setDescription(e.target.value)}
                                value={description}
                                aria-label="Milestone Description"
                                className="p-2 bg-transparent mt-4 rounded-md min-h-32 border-solid border-2 border-coffee_2 w-full"
                            />
                        </div>
                        <button
                            onClick={saveMilestone}
                            disabled={isAddDisabled}
                            aria-label="Add Milestone Button"
                            className={`mt-4 font-semibold py-2 px-4 border-2 rounded-lg ${
                                isAddDisabled
                                    ? "text-gray-400 border-gray-400"
                                    : "text-lime-900 border-lime-900 hover:text-white hover:bg-lime-900 hover:border-lime-900"
                            }`}
                        >
                            Add Milestone
                        </button>
                    </div>
                    {milestones.length > 0 && (
                        <div className="mt-8">
                            <h6 className="font-semibold border-t-solid border-t-2 pt-6 border-t-coffee_2">
                                Milestones:
                            </h6>
                            <table className="w-full mt-6 border-collapse border border-coffee_2">
                                <thead>
                                    <tr>
                                        <th className="border border-coffee_2 p-2">#</th>
                                        <th className="border border-coffee_2 p-2">Amount (EUR)</th>
                                        <th className="border border-coffee_2 p-2">Description</th>
                                        <th className="border border-coffee_2 p-2">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {milestones.map((milestone, index) => (
                                        <tr key={index}>
                                            <td className="border border-coffee_2 p-2 text-center">{index + 1}</td>
                                            <td className="border border-coffee_2 p-2 text-center">{milestone.amount}</td>
                                            <td className="border border-coffee_2 p-2">{milestone.description}</td>
                                            <td className="border border-coffee_2 p-2 text-center">
                                                <button
                                                    value={milestone.index}
                                                    onClick={removeMilestone}
                                                    className="text-red-900 italic text-sm"
                                                >
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {goalAmount && totalMilestoneSum >= parseInt(goalAmount || 0) && (
                        <p className="mt-2 font-semibold text-gray-500">
                            Milestone limit reached.
                        </p>
                    )}
                    <p className={`mt-4 font-semibold ${parseInt(goalAmount || 0) - totalMilestoneSum < 0 ? "text-red-500" : "text-green-700"}`}>
                        Remaining Amount: {parseInt(goalAmount || 0) - totalMilestoneSum} EUR
                    </p>
                </div>
                <button
                    onClick={createProject}
                    disabled={isCreateDisabled}
                    aria-label="Create Project Button"
                    className={`float-right mt-12 font-semibold py-2 px-4 border-2 rounded-lg ${
                        isCreateDisabled
                            ? "text-gray-400 border-gray-400"
                            : "text-lime-900 border-lime-900 hover:text-white hover:bg-lime-900 hover:border-lime-900"
                    }`}
                >
                    Create Project
                </button>
            </form>
        </div>
    );
}
