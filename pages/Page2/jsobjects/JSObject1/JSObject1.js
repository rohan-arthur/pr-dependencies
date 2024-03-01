export default {
	myVar1: [],
	myVar2: {},
	myFun1 () {
		//	write code here
		//	this.myVar1 = [1,2,3]
	},
	extractPullRequests(response) {
		return response.data.repository.pullRequests.edges.map(edge => edge.node);
	},
	async loadData (){
		const response = await GetMergedPRs.run();
		const response_ee = await GetMergedPRs_ee.run();
		const response_cs = await GetMergedPRs_cs.run();
		/*
		const allPullRequests = [
			...this.extractPullRequests(response),
			...this.extractPullRequests(response_ee),
			...this.extractPullRequests(response_cs),
		];
*/
		const concatenatedEdges = [
			...response.data.repository.pullRequests.edges,
			...response_ee.data.repository.pullRequests.edges,
			...response_cs.data.repository.pullRequests.edges,
		];
		const allPullRequests = {
			edges: concatenatedEdges
		};
		storeValue('queryResponse',response);
		storeValue('allPullRequests',allPullRequests);
		this.mapPodsChartWithOrgColors();
		return allPullRequests;
	},
	mapIndividualsChart () {
		//const prData = appsmith.store.queryResponse.data.repository.pullRequests;
		const prData = appsmith.store.allPullRequests;

		let nodes = new Set();
		let links = [];

		const excludedAgents = ["coderabbitai"]; 
		try{
			prData.edges.forEach(edge => {
				const pr = edge.node;
				// Check if PR author is not a bot
				if (!excludedAgents.includes(pr.author.login)) {
					nodes.add(pr.author.login); // Add PR author to nodes if not a bot
				}

				// Process each review
				pr.reviews.nodes.forEach(review => {
					// Check if reviewer is not a bot
					if (!excludedAgents.includes(review.author.login)) {
						nodes.add(review.author.login); // Add reviewer to nodes if not a bot
						// Ensure both source and target are not bots before adding the link
						if (!excludedAgents.includes(pr.author.login)) {
							links.push({
								source: pr.author.login,
								target: review.author.login,
								value: 1 // Assuming 'value' represents the connection strength or count
							});
						}
					}
				});
			});

		}catch(e){

		}

		// Convert Set of nodes to desired format
		nodes = Array.from(nodes).map(login => ({
			name: login,
			draggable: true
		}));

		const chartData = {
			tooltip: {},
			animationDurationUpdate: 1500,
			animationEasingUpdate: "quinticInOut",
			series: [
				{
					type: "graph",
					layout: "circular",
					symbolSize: 50,
					roam: true,
					label: {
						show: true
					},
					edgeSymbol: ["circle", "arrow"],
					edgeSymbolSize: [4, 10],
					data: nodes,
					links: links,
					lineStyle: {
						width: 2,
						curveness: 0.3
					},
					force: {
						repulsion: 5000,
						edgeLength: [100, 200],
						gravity: 0.2,
					}
				}
			]
		};

		storeValue('chartData', chartData);
		return prData;//chartData;
	},
	mapPodsChart () {
		//const prData = appsmith.store.queryResponse.data.repository.pullRequests;
		const prData = appsmith.store.allPullRequests;

		let nodes = new Set();
		let linksMap = new Map();

		try{
			prData.edges.forEach(edge => {
				const pr = edge.node;
				const authorPod = this.findPodForMember(pr.author.login);

				// Skip PRs where the author is not in any pod
				if (!authorPod) return;
				const authorOrg = this.findOrgForPod(authorPod);
				// Process each review, focusing on interactions at the pod level
				pr.reviews.nodes.forEach(review => {
					// Skip "DISMISSED" reviews
					if (review.state === "DISMISSED") return;

					const reviewerPod = this.findPodForMember(review.author.login);

					const reviewerOrg = this.findOrgForPod(reviewerPod);

					// Skip reviews where the reviewer is not in any pod or is in the same pod as the author
					if (!reviewerPod || authorPod === reviewerPod) return;

					// Record the interaction between pods
					nodes.add(authorPod);
					nodes.add(reviewerPod);
					const linkKey = `${authorPod}->${reviewerPod}`;
					linksMap.set(linkKey, (linksMap.get(linkKey) || 0) + 1);
				});
			});
		} catch(e){
			//
		}

		// Prepare data for ECharts
		const links = Array.from(linksMap).map(([key, value]) => {
			const [source, target] = key.split('->');
			return { source, target, value };
		});

		const podChartData = {
			tooltip: {},
			animationDurationUpdate: 1500,
			animationEasingUpdate: "quinticInOut",
			series: [
				{
					type: "graph",
					layout: "circular",
					symbolSize: 50,
					roam: true,
					label: {
						show: true
					},
					edgeSymbol: ["circle", "arrow"],
					edgeSymbolSize: [4, 10],
					data: Array.from(nodes).map(name => ({ name, draggable: true })),
					links: links,
					lineStyle: {
						width: 2,
						curveness: 0.3
					},
					force: {
						repulsion: 1000,
						edgeLength: [150, 300]
					}
				}
			]
		};

		storeValue("podChartData", podChartData);
		return podChartData;
	},
	podComposition () {
		const podMemberships = {
			"Integrations": ["sumitsum", "sneha122", "NilanshBansal", "AmanAgarwal041", "rishabhrathod01"],
			"IDE": ["hetunandu", "albinAppsmith"],
			"Modules": ["ApekshaBhosale", "ashit-rath", "ankitakinger", "subrata71", "kamakshibhat-appsmith", "pedro-santos-rodrigues"],
			"Git": ["nidhi-nair", "brayn003", "riteshkew"],
			"Widgets": ["sbalaji1192"],
			"Business Experience": ["abhvsn", "pranayagarwal96", "RoopKrrish9696", "deepikaappsmith"],
			"Workflows": ["sondermanish", "nsarupr", "ayushpahwa", "infinitetrooper", "parth-appsmith", "srix"],
			"Stability": ["trishaanand", "mohanarpit"],
			"QA": ["yatinappsmith", "Aishwarya-U-R", "RakshaKShetty", "btsgh", "ramsaptami", "Parthvi12", "laveena-en", "shadabbuchh", "sarojsarab"],
			"Design": ["vinay-appsmith", "BharghaviK"],
			"Product": [],
			"AI": ["vivonk", "dvj1988", "bharath31"],
			"Templates": ["AnaghHegde", "rahulbarwal", "jacquesikot"],
			"Website": ["tejasahluwalia"],
			"WDS": ["riodeuno", "somangshu", "ichik", "prsidhu", "marks0351", "tbrizitsky", "andreevanatasha", "KelvinOm", "jsartisan"],
			"Performance": ["rajatagrawal", "vsvamsi1"],
			"Devops": ["pratapaprasanna", "sharat87"],
			"Writers": []
		}
		return podMemberships;
	},
	findPodForMember(login) {
		for (const [pod, members] of Object.entries(this.podComposition())) {
			if (members.includes(login)) {
				return pod;
			}
		}
		return null; 
	},
	orgComposition () {
		const orgMemberships = {
			"Activation": ["Integrations", "IDE", "Templates"],
			"Monetization": ["Git", "Business Experience", "Workflows", "Stability", "Modules"],
			"Multigoal": ["Widgets", "Website", "WDS", "Performance"],
			"Differentiation": ["AI" ],
			"Shared": ["QA", "Design", "Product", "Devops", "Writers"]
		}
		return orgMemberships;
	},
	findOrgForPod (pod) {
		for (const [org, pods] of Object.entries(this.orgComposition())) {
			if (pods.includes(pod)) {
				return org;
			}
		}
		return null; 
	},
	mapPodsChartWithOrgColors() {
		//const prData = appsmith.store.queryResponse.data.repository.pullRequests;
		const prData = appsmith.store.allPullRequests;

		const podsOrgMap = {
			"Integrations": "Activation",
			"IDE": "Activation",
			"Templates": "Activation",
			"Git": "Monetization",
			"Business Experience": "Monetization",
			"Workflows": "Monetization",
			"Stability": "Monetization",
			"Modules": "Monetization",
			"Widgets": "Multigoal",
			"Website": "Multigoal",
			"WDS": "Multigoal",
			"Performance": "Multigoal",
			"AI": "Differentiation",
			"QA": "Shared",
			"Design": "Shared",
			"Product": "Shared",
			"Devops": "Shared",
			"Writers": "Shared"
		};

		const orgCategories = {
			"Activation": 0,
			"Monetization": 1,
			"Shared": 2,
			"Multigoal": 3,
			"Differentiation": 4
		};
		let nodes = new Set();
		let linksMap = new Map();

		try{
			prData.edges.forEach(edge => {
				const pr = edge.node;
				const authorPod = this.findPodForMember(pr.author.login);

				// Skip PRs where the author is not in any pod
				if (!authorPod) return;
				const authorOrg = this.findOrgForPod(authorPod);
				// Process each review, focusing on interactions at the pod level
				pr.reviews.nodes.forEach(review => {
					// Skip "DISMISSED" reviews
					if (review.state === "DISMISSED") return;

					const reviewerPod = this.findPodForMember(review.author.login);

					const reviewerOrg = this.findOrgForPod(reviewerPod);

					// Skip reviews where the reviewer is not in any pod or is in the same pod as the author
					if (!reviewerPod || authorPod === reviewerPod) return;

					// Record the interaction between pods
					nodes.add(authorPod);
					nodes.add(reviewerPod);
					const linkKey = `${authorPod}->${reviewerPod}`;
					linksMap.set(linkKey, (linksMap.get(linkKey) || 0) + 1);
				});
			});
		} catch(e){
			//
		}

		// Prepare data for ECharts
		const links = Array.from(linksMap).map(([key, value]) => {
			const [source, target] = key.split('->');
			return { source, target, value };
		});

		// Sort nodes by category to encourage grouping
		const sortedNodes = Array.from(nodes).sort((a, b) => {
			return orgCategories[podsOrgMap[a]] - orgCategories[podsOrgMap[b]];
		});

		const podOrgChartData = {
			tooltip: {},
			animationDurationUpdate: 1500,
			animationEasingUpdate: "quinticInOut",
			series: [
				{
					type: "graph",
					layout: "circular",
					symbolSize: 50,
					roam: true,
					label: {
						show: true
					},
					edgeSymbol: ["circle", "arrow"],
					edgeSymbolSize: [4, 10],
					data: Array.from(sortedNodes).map(name => ({ name, draggable: true, category : orgCategories[podsOrgMap[name]] })),
					categories: Object.keys(orgCategories).map(org => ({ name: org })),
					links: links,
					lineStyle: {
						width: 2,
						curveness: 0.3,
						color: 'source'
					},
					force: {
						repulsion: 1500,
						gravity: 0.1,
						edgeLength: [150, 300]
					}
				}
			]
		};

		storeValue("podOrgChartData", podOrgChartData);
		return podOrgChartData;
	}



}