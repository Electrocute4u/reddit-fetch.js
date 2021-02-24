'use strict'
const FetchError = require('./errors/FetchError.js');
const nfetch = require('node-fetch');

/**
 *  HTTP GET request to retrieve JSON data from a post of the specified subreddit.
 *
 * @param {Object} options Function options.
 * @param {string} options.subreddit The target subreddit to retrieve the post from.
 * @param {string} options.type The sorting type to search for data. Sorting types: New, Top, Hot etc [Default: top]
 * @param {string} options.sort The sorting option to search for data. [Default: all]
 * @param {boolean?} [options.allowNSFW] Whether or not the returned post can be marked as NSFW. [Default: false]
 * @param {boolean?} [options.allowModPost] Whether or not the returned post can be distinguished as a moderator post. [Default: false]
 * @param {boolean?} [options.allowCrossPost] Whether or not the returned post can be a crosspost. [Default: false]
 * @param {boolean?} [options.onlyImage] Whether or not the returned post is an image. [Default: true]
 * @param {boolean?} [options.allowAllDomains] Whether or not the returned post can be from another domain then "i.redd.it" [Default: false]
 * @param {number?} [options.amount] The amount of objects to fetch. [Default: 1].
 *
 * @returns {Promise<object>} Promise that resolves to a JSON object value.
 */

async function redditFetch({ subreddit, type = `top` , sort = 'all', allowNSFW, allowModPost, allowCrossPost, onlyImage, allowAllDomains, amount = 1 }) {
    return new Promise((resolve, reject) => {

    /* Check required argument */
    if (!subreddit)
    return reject(new Error('Missing required argument "subreddit"'));

    /* Validate options */
    if (typeof(subreddit) !== 'string')
    return reject(new TypeError(`Expected type "string" but got "${typeof(subreddit)}"`));
    
    if (type && typeof(type) !== 'string')
    return reject(new TypeError(`Expected type "string" but got "${typeof(type)}"`));

    if (sort && typeof(sort) !== 'string')
    return reject(new TypeError(`Expected type "string" but got "${typeof(sort)}"`));

    if (allowNSFW && typeof(allowNSFW) !== 'boolean')
    return reject(new TypeError(`Expected type "boolean" but got "${typeof(allowNSFW)}"`));

    if (allowModPost && typeof(allowModPost) !== 'boolean')
    return reject(new TypeError(`Expected type "boolean" but got "${typeof(allowModPost)}"`));

    if (allowCrossPost && typeof(allowCrossPost) !== 'boolean')
    return reject(new TypeError(`Expected type "boolean" but got "${typeof(allowCrossPost)}"`));
    
    if (onlyImage && typeof(onlyImage) !== 'boolean')
    return reject(new TypeError(`Expected type "boolean" but got "${typeof(onlyImage)}"`));

    if (allowAllDomains && typeof(allowAllDomains) !== 'boolean')
    return reject(new TypeError(`Expected type "boolean" but got "${typeof(allowAllDomains)}"`));

    if (amount && typeof(amount) !== 'number')
    return reject(new TypeError(`Expected type "number" but got "${typeof(amount)}"`));
    
    
    /* Checking if amount is a number, if not, fallback to default value. */
    if(isNaN(amount)){
        amount = 1   
    } else {
        amount = amount
    }

    /* If given value is above 100, return only 100 (due to fetch limits) */
    if(amount > 100){
        amount = 100
    }

    /* If given value is 0, return it as 1 (default) */
    if(amount == 0){
        amount = 1
    }
    
    /* Configuration & target URL */
    sort = sort.toLowerCase();
    type = type.toLowerCase();
    
    /* Configure the sub reddit */
    let sub = subreddit.toLowerCase()

    /* if the sub reddit given includes the full link, remove it. */
    if(sub.startsWith(`https://www.reddit.com/r/`)){
        var path = sub
        var pathArray = path.split( '/' );
        sub = pathArray[4]
    }

    if(sub.startsWith(`https://reddit.com/r/`)){
        var path = sub
        var pathArray = path.split( '/' );
        sub = pathArray[4]
    }
    if(sub.startsWith(`https://reddit.com/`)){
        var path = sub
        var pathArray = path.split( '/' );
        sub = pathArray[3]
    }
    if(sub.startsWith(`reddit.com`)){
        var path = sub
        var pathArray = path.split( '/' );
        sub = pathArray[1]
    }
    if(sub.startsWith(`www.reddit.com`)){
        var path = sub
        var pathArray = path.split( '/' );
        sub = pathArray[1]
    }
    if(sub.startsWith(`/r/`)){
        var path = sub
        var pathArray = path.split( '/' );
        sub = pathArray[2]
    }
    if(sub.startsWith(`reddit.com/r`)){
        var path = sub
        var pathArray = path.split( '/' );
        sub = pathArray[2]
    }
    else if(sub.includes(`/`)){
        var path = sub
        var pathArray = path.split( '/' );
        sub = pathArray[0]
    }
    
    /* The final target URL to fetch from */
    const targetURL = `https://reddit.com/r/${sub}/${type}.json?sort=${sort}&t=all&limit=100`;
    

    // @ts-ignore
    nfetch(targetURL).then(res => res.json())
    .then(body => {
		
	let post
	
    /* If body was not found at all return as null */
    if (!body){
        post = null;
        return resolve(post);
    }
	
    /* If body.data was not found at all return as null */
        if (!body.data){
            post = null;
            return resolve(post);
        }
	
        // If reason is found and it equals private return as "private"
        if (body.reason && body.reason.toLowerCase() === "private"){
           post = "private";
           return resolve(post);
        }

        // If body.children is empty or not present return as "invalid"
        if (!body.data.children || body.data.children <= 0){
           post = "invalid";
           return resolve(post);
        }

        /* Array of found submissions */
        let found = body.data.children;
        
		/* Apply options */
		
		/* Allow NSFW posts [default: false] */
        if (!allowNSFW)
        found = found.filter(p => !p.data.over_18);

		/* Allow a MOD post [default: false] */
        if (!allowModPost)
        found = found.filter(p => !p.data.distinguished);

		/* Allow Crossposts [default: false] */
        if (!allowCrossPost)
        found = found.filter(p => !p.data.crosspost_parent_list);

		/* Allow all sort of posts (e.g videos, external links, no image posts etc) [default: false] */
        if (!onlyImage)
        found = found
        
        if (onlyImage && onlyImage === true)
        found = found.filter(p => p.data.post_hint == "image");
        
        /* Allow all domains [default: false] */
        if (!allowAllDomains)
        found = found.filter(p => p.data.domain == "i.redd.it");
        
        if (allowAllDomains && allowAllDomains == true)
        found = found

		/* If nothing is found, return post as 0, will allow for easier catching. */
        if (!found.length){
            post = 0
            return resolve(post);
        }
        
        /* If the specified amount is only 1, return 1. */
        if(amount == 1 ){
        
        /* Pick random post from array of found data */
        let randInt = Math.floor(Math.random() * found.length);
        post = found[randInt].data;
        return resolve(post);
        }
        
        /* Slice the JSON down to the correct amount (if above 1) */
        else {
        post = found.slice(0, amount)
        /* Returns the objects */
        return resolve(post);
        }

        });
    });
};
/* Exports it*/
module.exports = redditFetch;
